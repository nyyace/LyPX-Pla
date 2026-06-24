import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { ProfilesPageClient } from "@/components/profiles/ProfilesPageClient";

export default async function OperatorProfilesPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [memberships, inviteRequests] = await Promise.all([
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
    prisma.driverInviteRequest.findMany({
      where: { tenantId: tenant.id, status: { in: ["pending", "approved", "sent"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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

  const initialInviteRequests = inviteRequests.map((r) => ({
    id: r.id,
    driverWhatsapp: r.driverWhatsapp,
    driverName: r.driverName,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    sentAt: r.sentAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  }));

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <ProfilesPageClient
        initialDrivers={initialDrivers}
        initialInviteRequests={initialInviteRequests}
        timezone={tz}
        tenantId={tenant.id}
      />
    </div>
  );
}
