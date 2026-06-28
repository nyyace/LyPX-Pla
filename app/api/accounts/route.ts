import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { createInitialClaim } from "@/lib/claims/engine";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const segment = searchParams.get("segment");

  const accounts = await prisma.account.findMany({
    where: {
      ...(segment ? { customerSegment: segment } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      claims: { where: { status: { in: ["claimed", "won"] } }, take: 1 },
      _count: { select: { orders: true } },
    },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const body = await req.json();
  const {
    accountType = "business_entity",
    name,
    uen,
    customerSegment,
    sourceType,
    picName,
    picWhatsapp,
    picEmail,
    claimingPartyType,
    claimingPartyId,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // For individual accounts segment/source are auto-set; for business they're required
  const finalSegment = accountType === "individual" ? "individual" : customerSegment;
  const finalSource  = accountType === "individual" ? "lypx_sourced" : sourceType;

  if (!finalSegment || !finalSource) {
    return NextResponse.json({ error: "Customer segment and source are required" }, { status: 400 });
  }

  if (!picWhatsapp?.trim()) {
    return NextResponse.json(
      { error: "WhatsApp number is required — needed for trip notifications" },
      { status: 400 }
    );
  }

  const normalisedPhone = normalizePhone(picWhatsapp.trim());
  if (!normalisedPhone) {
    return NextResponse.json({ error: "Invalid WhatsApp number format" }, { status: 400 });
  }

  const account = await prisma.$transaction(async (tx: TxClient) => {
    const a = await tx.account.create({
      data: {
        accountType,
        name: name.trim(),
        uen: uen?.trim() || null,
        customerSegment: finalSegment,
        sourceType: finalSource,
        picName: picName?.trim() || null,
        picWhatsapp: normalisedPhone,
        picEmail: picEmail?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "account",
        entityId: a.id,
        action: "account_created",
        actorId: user.id,
        metadata: { name: a.name, accountType, customerSegment: finalSegment, sourceType: finalSource },
      },
    });

    return a;
  });

  await createInitialClaim({
    accountId: account.id,
    claimingPartyType: claimingPartyType ?? (finalSource === "lypx_sourced" ? "lypx_direct" : "operator"),
    claimingPartyId: claimingPartyId ?? undefined,
  });

  return NextResponse.json(account, { status: 201 });
}
