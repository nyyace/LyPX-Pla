import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { DispatchBoard } from "@/components/lypx/DispatchBoard";

export default async function AdminDispatchPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const [unassigned, active, tenants] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["booked"] }, driverId: null },
      orderBy: { pickupTime: "asc" },
      take: 30,
      include: { account: true, vehicle: true, tenant: true },
    }),
    prisma.order.findMany({
      where: { status: { in: ["assigned", "en_route", "arrived", "started"] } },
      orderBy: { pickupTime: "asc" },
      take: 60,
      include: {
        account: true,
        driver: true,
        vehicle: true,
        tenant: true,
      },
    }),
    prisma.tenant.findMany({
      where: { tenantType: "operator" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <DispatchBoard
      unassigned={unassigned}
      active={active}
      tenants={tenants}
      isAdmin
      timezone={tz}
    />
  );
}
