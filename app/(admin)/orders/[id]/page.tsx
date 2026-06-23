import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderActions } from "@/components/orders/OrderActions";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { formatTZ } from "@/lib/utils/date";

const statusColors: Record<string, string> = {
  booked: "border-gray-700 text-gray-400",
  assigned: "border-blue-700 text-blue-300",
  en_route: "border-blue-700 text-blue-300",
  arrived: "border-yellow-700 text-yellow-300",
  started: "border-yellow-700 text-yellow-300",
  completed: "border-green-700 text-green-300",
  cancelled: "border-red-700 text-red-300",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      account: true,
      driver: true,
      vehicle: true,
    },
  });

  if (!order) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/orders" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Reservations
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {formatTZ(order.pickupTime, tz)}
            </h1>
            <Link href={`/accounts/${order.accountId}`} className="text-sm text-gray-400 hover:text-white">
              {order.account.name}
            </Link>
          </div>
          <Badge variant="outline" className={`${statusColors[order.status]}`}>
            {order.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <OrderActions
        orderId={order.id}
        currentStatus={order.status}
        driverId={order.driverId}
        vehicleId={order.vehicleId}
      />

      <Card className="bg-gray-900 border-gray-800 mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Trip Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500 block text-xs mb-1">Pickup</span>
            <span className="text-white">{order.pickupLocation}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs mb-1">Drop-off</span>
            <span className="text-white">{order.dropoffLocation}</span>
          </div>
          {order.driver && (
            <div className="flex justify-between">
              <span className="text-gray-500">Driver</span>
              <Link href={`/drivers/${order.driverId}`} className="text-white hover:underline">
                {order.driver.firstName} {order.driver.lastName}
              </Link>
            </div>
          )}
          {order.vehicle && (
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <Link href={`/vehicles/${order.vehicleId}`} className="text-white hover:underline">
                {order.vehicle.plateNumber} — {order.vehicle.make} {order.vehicle.model}
              </Link>
            </div>
          )}
          {order.notes && (
            <div>
              <span className="text-gray-500 block text-xs mb-1">Notes</span>
              <p className="text-white">{order.notes}</p>
            </div>
          )}
          {order.completedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Completed</span>
              <span className="text-white">{formatTZ(order.completedAt, tz)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
