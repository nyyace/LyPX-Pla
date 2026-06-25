import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { DispatchBoard } from "@/components/lypx/DispatchBoard";

export default async function OperatorDispatchPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [unassigned, active] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: "booked",
        driverId: null,
        pickupTime: { lte: endOfToday },
      },
      orderBy: { pickupTime: "asc" },
      take: 30,
      include: { account: true, vehicle: true, tenant: true },
    }),
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ["assigned", "en_route", "arrived", "started"] },
      },
      orderBy: { pickupTime: "asc" },
      take: 60,
      include: { account: true, driver: true, vehicle: true, tenant: true },
    }),
  ]);

  return (
    <div style={{ height: "100%" }}>
      <DispatchBoard
        unassigned={unassigned}
        active={active}
        isAdmin={false}
        timezone={tz}
      />
    </div>
  );
}
