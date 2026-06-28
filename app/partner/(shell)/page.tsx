import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
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

export default async function PartnerDashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const account = await getPartnerAccount(user.id);
  if (!account) redirect("/");

  const tz = await getUserTimezone(user.id);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAhead  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [thisMonthCount, activeCount, upcomingCount, recentOrders] = await Promise.all([
    prisma.order.count({
      where: { accountId: account.id, createdAt: { gte: monthStart } },
    }),
    prisma.order.count({
      where: {
        accountId: account.id,
        status: { in: ["assigned", "en_route", "arrived", "started"] },
      },
    }),
    prisma.order.count({
      where: {
        accountId: account.id,
        status: { in: ["booked", "assigned"] },
        pickupTime: { gte: now, lte: weekAhead },
      },
    }),
    prisma.order.findMany({
      where: { accountId: account.id },
      orderBy: { pickupTime: "desc" },
      take: 5,
      select: {
        id: true, status: true, jobReference: true,
        pickupTime: true, pickupLocation: true, dropoffLocation: true,
        passengerName: true,
        driver: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{account.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Bookings this month", value: thisMonthCount },
          { label: "Active trips",        value: activeCount },
          { label: "Upcoming (7 days)",   value: upcomingCount },
        ].map(stat => (
          <Card key={stat.label} className="bg-gray-900 border-gray-800">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent bookings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-gray-300">Recent Bookings</CardTitle>
          <Link href="/partner/bookings" className="text-xs text-yellow-500 hover:text-yellow-400">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">{o.jobReference ?? "—"}</span>
                      <span className="text-sm text-white">{formatTZ(o.pickupTime, tz)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                      {o.pickupLocation}
                      {o.passengerName ? ` · ${o.passengerName}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_BADGE[o.status] ?? "border-gray-700 text-gray-400"}`}
                  >
                    {o.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
