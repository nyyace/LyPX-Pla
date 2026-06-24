import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";
import { addDays } from "@/lib/utils/date";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { decision, notes } = await req.json() as { decision: "allowed" | "rejected" | "flagged"; notes?: string };

  if (!["allowed", "rejected", "flagged"].includes(decision)) {
    return NextResponse.json({ error: "decision must be allowed | rejected | flagged" }, { status: 400 });
  }
  if (!notes?.trim()) {
    return NextResponse.json({ error: "Decision notes are required" }, { status: 400 });
  }

  const conflict = await prisma.claimConflict.findUnique({ where: { id } });
  if (!conflict) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conflict.status !== "pending") {
    return NextResponse.json({ error: "Conflict already decided" }, { status: 409 });
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.claimConflict.update({
      where: { id },
      data: {
        status: decision,
        adminDecision: notes.trim(),
        decidedBy: user.id,
        decidedAt: now,
      },
    });

    if (decision === "allowed") {
      // Create a new 90-day claim for the challenger
      const newClaim = await tx.accountClaim.create({
        data: {
          accountId: conflict.accountId,
          claimingPartyType: "operator",
          claimingPartyId: conflict.challengerTenantId,
          status: "claimed",
          claimedAt: now,
          expiryAt: addDays(now, 90),
          protectionTier: "standard",
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "account_claim",
          entityId: newClaim.id,
          action: "claim_created",
          actorId: user.id,
          metadata: { source: "conflict_allowed", conflictId: id, challengerTenantId: conflict.challengerTenantId },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "claim_conflict",
        entityId: id,
        action: `conflict_${decision}`,
        actorId: user.id,
        metadata: { accountId: conflict.accountId, challengerTenantId: conflict.challengerTenantId, notes: notes.trim() },
      },
    });

    return c;
  });

  return NextResponse.json(updated);
}
