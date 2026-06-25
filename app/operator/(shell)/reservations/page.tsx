import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { ReservationsTable } from "@/components/lypx/ReservationsTable";

export default async function OperatorReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);
  const params = await searchParams;

  const whereStatus = params.status && params.status !== "all"
    ? { status: params.status }
    : { status: { in: ["booked", "assigned", "en_route", "arrived", "started", "completed", "cancelled"] } };

  const orders = await prisma.order.findMany({
    where: { tenantId: tenant.id, ...whereStatus },
    orderBy: { pickupTime: "desc" },
    take: 100,
    select: {
      id: true, status: true, serviceType: true,
      pickupTime: true, pickupLocation: true, dropoffLocation: true, notes: true,
      fareAmount: true, fareCurrency: true,
      cancellationReason: true, cancelledAt: true,
      passengerName: true, passengerWhatsapp: true, sameAsRequestor: true,
      account: { select: { id: true, name: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { plateNumber: true, make: true, model: true } },
    },
  });

  return (
    <ReservationsTable
      orders={orders}
      tenantId={tenant.id}
      timezone={tz}
      currentStatus={params.status ?? "all"}
    />
  );
}
