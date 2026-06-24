import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { ProfilesPanel } from "@/components/lypx/ProfilesPanel";

export default async function OperatorProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; driver?: string; account?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);
  const params = await searchParams;
  const sub = params.sub ?? "drivers";

  const [memberships, accounts] = await Promise.all([
    prisma.operatorDriverMembership.findMany({
      where: { tenantId: tenant.id },
      include: {
        driver: {
          include: {
            documents: {
              where: { entityType: "driver" },
              orderBy: { expiryDate: "asc" },
            },
            vehicleOwnerships: {
              include: { vehicle: { select: { id: true, plateNumber: true, make: true, model: true } } },
              take: 1,
            },
            orders: {
              where: { tenantId: tenant.id, status: "completed" },
              orderBy: { completedAt: "desc" },
              take: 30,
              select: { id: true, completedAt: true },
            },
          },
        },
      },
    }),
    prisma.account.findMany({
      where: { claims: { some: { claimingPartyId: tenant.id, status: { in: ["claimed", "won"] } } } },
      include: {
        claims: {
          where: { claimingPartyId: tenant.id },
          orderBy: { claimedAt: "desc" },
          take: 1,
        },
        orders: {
          where: { tenantId: tenant.id, status: "completed" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: { id: true, completedAt: true },
        },
      },
    }),
  ]);

  const drivers = memberships.map(m => m.driver);

  return (
    <ProfilesPanel
      sub={sub}
      selectedDriverId={params.driver}
      selectedAccountId={params.account}
      drivers={drivers}
      accounts={accounts}
      tenantId={tenant.id}
      timezone={tz}
    />
  );
}
