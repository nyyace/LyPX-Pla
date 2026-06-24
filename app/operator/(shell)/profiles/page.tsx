import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { ProfilesPageClient } from "@/components/profiles/ProfilesPageClient";

export default async function OperatorProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);
  const params = await searchParams;
  const sub = params.sub === "accounts" ? "accounts" : "drivers";

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [memberships, claims] = await Promise.all([
    prisma.operatorDriverMembership.findMany({
      where: { tenantId: tenant.id },
      include: {
        driver: {
          include: {
            vehicleOwnerships: {
              include: {
                vehicle: {
                  select: { plateNumber: true, make: true, model: true, vehicleClass: true },
                },
              },
              take: 1,
            },
            orders: {
              where: { tenantId: tenant.id, status: "completed", completedAt: { gte: thirtyDaysAgo } },
              select: { id: true },
            },
            submission: {
              select: { vocationalLicenceExpiryDate: true },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    }),
    prisma.accountClaim.findMany({
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
    }),
  ]);

  const now = Date.now();

  const initialDrivers = memberships.map((m) => ({
    id: m.driver.id,
    firstName: m.driver.firstName,
    lastName: m.driver.lastName,
    phoneNumber: m.driver.phoneNumber,
    complianceStatus: m.driver.complianceStatus,
    tier1Member: m.tier1Member,
    tier2Qualified: m.driver.tier2Qualified,
    vehicleClass: m.driver.vehicleOwnerships[0]?.vehicle.vehicleClass ?? null,
    vehicle: m.driver.vehicleOwnerships[0]?.vehicle ?? null,
    vocationalLicenceExpiry:
      m.driver.submission?.vocationalLicenceExpiryDate?.toISOString() ?? null,
    tripCount30d: m.driver.orders.length,
  }));

  const initialAccounts = claims.map((c) => ({
    claimId: c.id,
    accountId: c.account.id,
    name: c.account.name,
    uen: c.account.uen ?? null,
    customerSegment: c.account.customerSegment,
    claimStatus: c.status,
    protectionTier: c.protectionTier,
    claimedAt: c.claimedAt.toISOString(),
    expiryAt: c.expiryAt.toISOString(),
    wonAt: c.wonAt?.toISOString() ?? null,
    daysRemaining: Math.ceil((c.expiryAt.getTime() - now) / 86400000),
    totalTrips: c.account._count.orders,
    lastTripAt: c.account.orders[0]?.completedAt?.toISOString() ?? null,
  }));

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <ProfilesPageClient
        initialDrivers={initialDrivers}
        initialAccounts={initialAccounts}
        sub={sub}
        timezone={tz}
        tenantId={tenant.id}
      />
    </div>
  );
}
