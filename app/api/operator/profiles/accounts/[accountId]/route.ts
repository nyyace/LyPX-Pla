import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { accountId } = await params;

  const claim = await prisma.accountClaim.findFirst({
    where: {
      accountId,
      claimingPartyType: "operator",
      claimingPartyId: tenant.id,
      status: { in: ["claimed", "won"] },
    },
    include: {
      account: {
        include: {
          orders: {
            where: { tenantId: tenant.id, status: "completed" },
            orderBy: { completedAt: "desc" },
            take: 20,
            select: {
              id: true,
              completedAt: true,
              pickupLocation: true,
              dropoffLocation: true,
              tripFare: true,
            },
          },
        },
      },
    },
  });

  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = Date.now();
  const daysRemaining = Math.ceil((claim.expiryAt.getTime() - now) / 86400000);
  const claimDuration = claim.expiryAt.getTime() - claim.claimedAt.getTime();
  const elapsed = now - claim.claimedAt.getTime();
  const progressPercent = Math.min(100, Math.round((elapsed / claimDuration) * 100));

  const a = claim.account;

  return NextResponse.json({
    accountId: a.id,
    name: a.name,
    uen: a.uen,
    customerSegment: a.customerSegment,
    picName: a.picName ?? null,
    picWhatsapp: a.picWhatsapp ?? null,
    picEmail: a.picEmail ?? null,
    claim: {
      id: claim.id,
      status: claim.status,
      protectionTier: claim.protectionTier,
      claimedAt: claim.claimedAt.toISOString(),
      expiryAt: claim.expiryAt.toISOString(),
      wonAt: claim.wonAt?.toISOString() ?? null,
      daysRemaining,
      progressPercent,
    },
    totalTrips: a.orders.length,
    recentOrders: a.orders.map((o) => ({
      id: o.id,
      completedAt: o.completedAt?.toISOString() ?? null,
      pickupLocation: o.pickupLocation,
      dropoffLocation: o.dropoffLocation,
      tripFare: o.tripFare,
    })),
  });
}
