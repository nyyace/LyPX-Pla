import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

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
      account: {
        select: {
          id: true,
          name: true,
          uen: true,
          customerSegment: true,
          _count: { select: { orders: true } },
          orders: {
            where: { tenantId: tenant.id, status: "completed" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { completedAt: true },
          },
        },
      },
    },
    orderBy: { claimedAt: "desc" },
  });

  const now = Date.now();

  return NextResponse.json(
    claims.map((c) => {
      const daysRemaining = Math.ceil((c.expiryAt.getTime() - now) / 86400000);
      return {
        claimId: c.id,
        accountId: c.account.id,
        name: c.account.name,
        uen: c.account.uen,
        customerSegment: c.account.customerSegment,
        claimStatus: c.status,
        protectionTier: c.protectionTier,
        claimedAt: c.claimedAt.toISOString(),
        expiryAt: c.expiryAt.toISOString(),
        wonAt: c.wonAt?.toISOString() ?? null,
        daysRemaining,
        totalTrips: c.account._count.orders,
        lastTripAt: c.account.orders[0]?.completedAt?.toISOString() ?? null,
      };
    })
  );
}
