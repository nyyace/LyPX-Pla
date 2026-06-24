import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";
import { isValidUEN, formatUEN } from "@/lib/utils/uen";
import { addDays } from "@/lib/utils/date";

// GET — list accounts claimed by this operator
export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const claims = await prisma.accountClaim.findMany({
    where: {
      claimingPartyType: "operator",
      claimingPartyId: tenant.id,
      status: { in: ["claimed", "won"] },
    },
    include: {
      account: { select: { id: true, name: true, uen: true, customerSegment: true } },
    },
    orderBy: { claimedAt: "desc" },
  });

  return NextResponse.json(claims);
}

// POST — onboard a new account with UEN claim, or file a ClaimConflict
export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name: string;
    uen: string;
    customerSegment?: string;
    noPic?: boolean;
    picName?: string | null;
    picWhatsapp?: string | null;
    picEmail?: string;
    notes?: string;
    challengerNote?: string;
  };

  const { name, uen, customerSegment, noPic, picName, picWhatsapp, picEmail, challengerNote } = body;
  const resolvedSegment = customerSegment || "corporate_general";

  if (!name?.trim() || !uen?.trim()) {
    return NextResponse.json({ error: "name and uen are required" }, { status: 400 });
  }
  if (!noPic && (!picName?.trim() || !picWhatsapp?.trim())) {
    return NextResponse.json({ error: "PIC name and WhatsApp number are required" }, { status: 400 });
  }
  if (!isValidUEN(uen)) {
    return NextResponse.json({ error: "Invalid UEN format" }, { status: 400 });
  }

  const formattedUEN = formatUEN(uen);
  const now = new Date();

  // Check for existing account + active claim
  const existing = await prisma.account.findUnique({
    where: { uen: formattedUEN },
    include: {
      claims: { where: { status: { in: ["claimed", "won"] } }, take: 1 },
    },
  });

  if (existing && existing.claims.length > 0) {
    // Conflict — file a ClaimConflict
    const conflict = await prisma.$transaction(async (tx) => {
      const c = await tx.claimConflict.create({
        data: {
          accountId: existing.id,
          existingClaimId: existing.claims[0].id,
          challengerTenantId: tenant.id,
          challengerNote: challengerNote?.trim() ?? null,
          status: "pending",
        },
      });
      await tx.auditLog.create({
        data: {
          entityType: "claim_conflict",
          entityId: c.id,
          action: "conflict_filed",
          actorId: user.id,
          metadata: { accountId: existing.id, uen: formattedUEN, challengerTenantId: tenant.id },
        },
      });
      return c;
    });

    return NextResponse.json(
      { status: "conflict", conflictId: conflict.id, message: "Your request has been submitted for review." },
      { status: 202 }
    );
  }

  // Clear — create Account + claim
  const result = await prisma.$transaction(async (tx) => {
    const accountId = existing?.id ?? (await tx.account.create({
      data: {
        name: name.trim(),
        uen: formattedUEN,
        customerSegment: resolvedSegment,
        sourceType: "operator_sourced",
        picName: noPic ? null : (picName?.trim() ?? null),
        picWhatsapp: noPic ? null : (picWhatsapp?.trim() ?? null),
        picEmail: picEmail?.trim() ?? null,
      },
      select: { id: true },
    })).id;

    const claim = await tx.accountClaim.create({
      data: {
        accountId,
        claimingPartyType: "operator",
        claimingPartyId: tenant.id,
        status: "claimed",
        claimedAt: now,
        expiryAt: addDays(now, 90),
        protectionTier: "standard",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "account_claim",
        entityId: claim.id,
        action: "claim_created",
        actorId: user.id,
        metadata: { accountId, uen: formattedUEN, tenantId: tenant.id },
      },
    });

    return { accountId, claim };
  });

  return NextResponse.json({ status: "claimed", ...result }, { status: 201 });
}
