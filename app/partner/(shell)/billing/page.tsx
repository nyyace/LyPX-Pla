import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getPartnerAccount } from "@/lib/utils/partner";
import { getUserTimezone } from "@/lib/utils/timezone";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatTZDate } from "@/lib/utils/date";

export default async function PartnerBillingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const account = await getPartnerAccount(user.id);
  if (!account) redirect("/");

  const tz = await getUserTimezone(user.id);

  const completedOrders = await prisma.order.findMany({
    where: {
      accountId: account.id,
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true, jobReference: true, completedAt: true, pickupTime: true,
      pickupLocation: true, dropoffLocation: true,
      fareAmount: true, fareCurrency: true,
      passengerName: true,
    },
  });

  const totalAmount = completedOrders
    .filter(o => o.fareAmount != null)
    .reduce((sum, o) => sum + (o.fareAmount ?? 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">{account.name}</p>
        </div>
        {completedOrders.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Total completed trips</p>
            <p className="text-lg font-semibold text-white">
              SGD {totalAmount.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Job Ref</TableHead>
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Trip</TableHead>
              <TableHead className="text-gray-400">Passenger</TableHead>
              <TableHead className="text-gray-400 text-right">Fare</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-600 py-12">
                  No completed trips yet
                </TableCell>
              </TableRow>
            )}
            {completedOrders.map(o => (
              <TableRow key={o.id} className="border-gray-800 hover:bg-gray-900">
                <TableCell className="text-xs font-mono text-gray-400">{o.jobReference ?? "—"}</TableCell>
                <TableCell className="text-sm text-white whitespace-nowrap">
                  {formatTZDate(o.completedAt ?? o.pickupTime, tz)}
                </TableCell>
                <TableCell className="text-xs text-gray-400 max-w-[200px]">
                  <div className="truncate">{o.pickupLocation}</div>
                  {o.dropoffLocation && (
                    <div className="truncate text-gray-600">→ {o.dropoffLocation}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-gray-400">{o.passengerName ?? "—"}</TableCell>
                <TableCell className="text-sm text-white text-right font-mono">
                  {o.fareAmount != null
                    ? `${o.fareCurrency ?? "SGD"} ${o.fareAmount.toFixed(2)}`
                    : <span className="text-gray-600">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs border-green-700 text-green-300">
                    completed
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
