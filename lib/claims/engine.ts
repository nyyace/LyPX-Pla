import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

const CLAIM_WINDOW_DAYS = 90;
const LONG_TERM_PROTECTION_TRIPS = 10;

// Creates an initial claim when an account is onboarded.
export async function createInitialClaim({
  accountId,
  claimingPartyType,
  claimingPartyId,
}: {
  accountId: string;
  claimingPartyType: "operator" | "lypx_direct";
  claimingPartyId?: string;
}): Promise<void> {
  const now = new Date();

  await prisma.$transaction([
    prisma.accountClaim.create({
      data: {
        accountId,
        claimingPartyType,
        claimingPartyId: claimingPartyId ?? null,
        status: "claimed",
        claimedAt: now,
        expiryAt: addDays(now, CLAIM_WINDOW_DAYS),
        protectionTier: "standard",
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "account_claim",
        entityId: accountId,
        action: "claim_created",
        actorId: claimingPartyId ?? "lypx_direct",
        metadata: { claimingPartyType, claimingPartyId },
      },
    }),
  ]);
}

// Called when a trip (Order) is completed — flips the active claim to "won" on first trip.
// Also recalculates long-term protection tier.
export async function onTripCompleted(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { account: { include: { claims: true } } },
  });

  const activeClaim = order.account.claims.find(
    (c) => c.status === "claimed" || c.status === "won"
  );
  if (!activeClaim) return;

  const now = new Date();

  if (activeClaim.status === "claimed") {
    await prisma.$transaction([
      prisma.accountClaim.update({
        where: { id: activeClaim.id },
        data: {
          status: "won",
          wonAt: now,
          firstTripOrderId: orderId,
          lastTripCompletedAt: now,
        },
      }),
      prisma.auditLog.create({
        data: {
          entityType: "account_claim",
          entityId: activeClaim.id,
          action: "claim_won",
          actorId: "system",
          metadata: { orderId, accountId: order.accountId },
        },
      }),
    ]);
  } else {
    await prisma.accountClaim.update({
      where: { id: activeClaim.id },
      data: { lastTripCompletedAt: now },
    });
  }
  await recalculateProtectionTier(activeClaim.id);
}

// Recalculates protection tier: long_term if ≥ LONG_TERM_PROTECTION_TRIPS completed under this claim.
async function recalculateProtectionTier(claimId: string): Promise<void> {
  const claim = await prisma.accountClaim.findUniqueOrThrow({
    where: { id: claimId },
  });

  const completedCount = await prisma.order.count({
    where: {
      accountId: claim.accountId,
      status: "completed",
      completedAt: { gte: claim.claimedAt },
    },
  });

  const newTier =
    completedCount >= LONG_TERM_PROTECTION_TRIPS ? "long_term" : "standard";

  if (newTier !== claim.protectionTier) {
    await prisma.accountClaim.update({
      where: { id: claimId },
      data: { protectionTier: newTier },
    });
  }
}

// Expires all claims whose 90-day window has passed without a won trip.
// Run nightly.
export async function expireStaleClaimsJob(): Promise<void> {
  const now = new Date();

  const stale = await prisma.accountClaim.findMany({
    where: {
      status: "claimed",
      expiryAt: { lte: now },
    },
  });

  for (const claim of stale) {
    await prisma.$transaction([
      prisma.accountClaim.update({
        where: { id: claim.id },
        data: { status: "expired" },
      }),
      prisma.auditLog.create({
        data: {
          entityType: "account_claim",
          entityId: claim.id,
          action: "claim_expired",
          actorId: "system",
          metadata: { accountId: claim.accountId },
        },
      }),
    ]);
  }
}
