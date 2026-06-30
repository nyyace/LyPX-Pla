import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect, notFound } from "next/navigation";
import { getPartnerAccount } from "@/lib/utils/partner";
import { getUserTimezone } from "@/lib/utils/timezone";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTZ } from "@/lib/utils/date";

const STATUS_BADGE: Record<string, string> = {
  booked:    "border-yellow-700 text-yellow-300",
  assigned:  "border-blue-700 text-blue-300",
  en_route:  "border-blue-700 text-blue-300",
  arrived:   "border-blue-600 text-blue-200",
  started:   "border-green-700 text-green-300",
  completed: "border-green-700 text-green-300",
  cancelled: "border-red-700 text-red-300",
};

const SERVICE_LABEL: Record<string, string> = {
  p2p:              "Point to Point",
  departure:        "Airport Departure",
  arrival_mng:      "Airport Arrival (Meet & Greet)",
  arrival_driveway: "Airport Arrival (Driveway)",
  disposal:         "Hourly Disposal",
  flexible:         "Flexible / Charter",
};

export default async function PartnerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const account = await getPartnerAccount(user.id);
  if (!account) redirect("/");

  const tz = await getUserTimezone(user.id);

  const order = await prisma.order.findFirst({
    where: { id, accountId: account.id },
    select: {
      id: true, status: true, jobReference: true,
      serviceType: true, pickupTime: true,
      pickupLocation: true, dropoffLocation: true,
      flightNumber: true, nameBoardText: true, disposalHours: true,
      passengerName: true, passengerWhatsapp: true,
      notes: true, fareAmount: true, fareCurrency: true,
      completedAt: true, createdAt: true,
      driver: { select: { firstName: true, lastName: true, phoneNumber: true } },
      vehicle: { select: { plateNumber: true, make: true, model: true } },
    },
  });

  if (!order) notFound();

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-white text-right max-w-xs">{value}</span>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/partner/bookings" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← My Bookings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {order.jobReference ?? "Booking"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {(order.serviceType ? SERVICE_LABEL[order.serviceType] : null) ?? order.serviceType}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-sm px-3 py-1 ${STATUS_BADGE[order.status] ?? "border-gray-700 text-gray-400"}`}
          >
            {order.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Trip Details */}
      <Card className="bg-gray-900 border-gray-800 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Trip Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Pickup time"     value={formatTZ(order.pickupTime, tz)} />
          <Row label="Pickup location" value={order.pickupLocation} />
          {order.dropoffLocation && (
            <Row label="Dropoff location" value={order.dropoffLocation} />
          )}
          {order.flightNumber && (
            <Row label="Flight number" value={order.flightNumber} />
          )}
          {order.nameBoardText && (
            <Row label="Name board" value={order.nameBoardText} />
          )}
          {order.disposalHours && (
            <Row label="Disposal hours" value={`${order.disposalHours} hours`} />
          )}
        </CardContent>
      </Card>

      {/* Passenger */}
      {(order.passengerName || order.passengerWhatsapp) && (
        <Card className="bg-gray-900 border-gray-800 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Passenger</CardTitle>
          </CardHeader>
          <CardContent>
            {order.passengerName && (
              <Row label="Name" value={order.passengerName} />
            )}
            {order.passengerWhatsapp && (
              <Row label="WhatsApp" value={order.passengerWhatsapp} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Driver & Vehicle */}
      {(order.driver || order.vehicle) && (
        <Card className="bg-gray-900 border-gray-800 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Driver &amp; Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            {order.driver && (
              <Row
                label="Driver"
                value={`${order.driver.firstName} ${order.driver.lastName}`}
              />
            )}
            {order.driver?.phoneNumber && (
              <Row label="Driver contact" value={order.driver.phoneNumber} />
            )}
            {order.vehicle && (
              <Row
                label="Vehicle"
                value={`${order.vehicle.make} ${order.vehicle.model} · ${order.vehicle.plateNumber}`}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Fare */}
      {order.fareAmount != null && (
        <Card className="bg-gray-900 border-gray-800 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Fare</CardTitle>
          </CardHeader>
          <CardContent>
            <Row
              label="Amount"
              value={`${order.fareCurrency ?? "SGD"} ${order.fareAmount.toFixed(2)}`}
            />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {order.notes && (
        <Card className="bg-gray-900 border-gray-800 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Special Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <p className="text-xs text-gray-700 mt-4">
        Booking ID: {order.id} · Submitted {formatTZ(order.createdAt, tz)}
      </p>
    </div>
  );
}
