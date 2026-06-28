import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getPartnerAccount } from "@/lib/utils/partner";
import { getUserTimezone } from "@/lib/utils/timezone";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatTZ } from "@/lib/utils/date";
import { Plus } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  booked:    "border-yellow-700 text-yellow-300",
  assigned:  "border-blue-700 text-blue-300",
  en_route:  "border-blue-700 text-blue-300",
  arrived:   "border-blue-600 text-blue-200",
  started:   "border-green-700 text-green-300",
  completed: "border-green-700 text-green-300",
  cancelled: "border-red-700 text-red-300",
};

export default async function PartnerBookingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const account = await getPartnerAccount(user.id);
  if (!account) redirect("/");

  const tz = await getUserTimezone(user.id);

  const orders = await prisma.order.findMany({
    where: { accountId: account.id },
    orderBy: { pickupTime: "desc" },
    take: 100,
    select: {
      id: true, status: true, jobReference: true,
      pickupTime: true, pickupLocation: true, dropoffLocation: true,
      passengerName: true, passengerWhatsapp: true,
      driver: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">{account.name}</p>
        </div>
        <Link href="/partner/bookings/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            New Booking
          </Button>
        </Link>
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Job Ref</TableHead>
              <TableHead className="text-gray-400">Date &amp; Time</TableHead>
              <TableHead className="text-gray-400">Pickup</TableHead>
              <TableHead className="text-gray-400">Dropoff</TableHead>
              <TableHead className="text-gray-400">Passenger</TableHead>
              <TableHead className="text-gray-400">Driver</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-600 py-12">
                  No bookings yet.{" "}
                  <Link href="/partner/bookings/new" className="text-yellow-500 hover:underline">
                    Submit your first booking →
                  </Link>
                </TableCell>
              </TableRow>
            )}
            {orders.map(o => (
              <TableRow key={o.id} className="border-gray-800 hover:bg-gray-900">
                <TableCell className="text-xs font-mono text-gray-400">{o.jobReference ?? "—"}</TableCell>
                <TableCell className="text-sm text-white whitespace-nowrap">{formatTZ(o.pickupTime, tz)}</TableCell>
                <TableCell className="text-xs text-gray-400 max-w-[180px] truncate">{o.pickupLocation}</TableCell>
                <TableCell className="text-xs text-gray-400 max-w-[180px] truncate">{o.dropoffLocation ?? "—"}</TableCell>
                <TableCell className="text-xs text-gray-400">{o.passengerName ?? "—"}</TableCell>
                <TableCell className="text-xs text-gray-400">
                  {o.driver ? `${o.driver.firstName} ${o.driver.lastName}` : "Unassigned"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_BADGE[o.status] ?? "border-gray-700 text-gray-400"}`}
                  >
                    {o.status.replace("_", " ")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
