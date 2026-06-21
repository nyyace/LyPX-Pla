import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  booked: "border-gray-700 text-gray-400",
  assigned: "border-blue-700 text-blue-300",
  en_route: "border-blue-700 text-blue-300",
  arrived: "border-yellow-700 text-yellow-300",
  started: "border-yellow-700 text-yellow-300",
  completed: "border-green-700 text-green-300",
  cancelled: "border-red-700 text-red-300",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const params = await searchParams;
  const activeStatuses = ["booked", "assigned", "en_route", "arrived", "started"];

  const orders = await prisma.order.findMany({
    where: params.status ? { status: params.status } : { status: { in: activeStatuses } },
    orderBy: { pickupTime: "desc" },
    take: 100,
    include: {
      account: { select: { name: true } },
      driver: { select: { firstName: true, lastName: true } },
      vehicle: { select: { plateNumber: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manual trip log</p>
        </div>
        <Link href="/orders/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            New Order
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[null, "booked", "completed", "cancelled"].map((s) => (
          <Link
            key={s ?? "active"}
            href={s ? `/orders?status=${s}` : "/orders"}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              (params.status === s || (!s && !params.status))
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {s === null ? "Active" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Pickup Time</TableHead>
              <TableHead className="text-gray-400">Account</TableHead>
              <TableHead className="text-gray-400">Route</TableHead>
              <TableHead className="text-gray-400">Driver</TableHead>
              <TableHead className="text-gray-400">Vehicle</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-600 py-12">
                  No orders found
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => (
              <TableRow key={o.id} className="border-gray-800 hover:bg-gray-900">
                <TableCell className="text-gray-300 text-sm">
                  <Link href={`/orders/${o.id}`} className="text-white hover:underline">
                    {format(new Date(o.pickupTime), "dd MMM HH:mm")}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{o.account.name}</TableCell>
                <TableCell>
                  <div className="text-xs text-gray-400">
                    <p className="truncate max-w-48">{o.pickupLocation}</p>
                    <p className="truncate max-w-48 text-gray-600">→ {o.dropoffLocation}</p>
                  </div>
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {o.driver ? `${o.driver.firstName} ${o.driver.lastName}` : <span className="text-gray-600">Unassigned</span>}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {o.vehicle?.plateNumber ?? <span className="text-gray-600">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusColors[o.status]}`}>
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
