import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { formatTZDate, isExpired } from "@/lib/utils/date";

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const [
    totalDrivers,
    suspendedDrivers,
    pendingDocuments,
    totalVehicles,
    openTakeoverRequests,
    activeOrders,
    recentClaims,
  ] = await Promise.all([
    prisma.driver.count(),
    prisma.driver.count({ where: { complianceStatus: "suspended" } }),
    prisma.complianceDocument.count({ where: { status: "pending_review" } }),
    prisma.vehicle.count(),
    prisma.takeoverRequest.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: { in: ["booked", "assigned", "en_route", "arrived", "started"] } } }),
    prisma.accountClaim.findMany({
      where: { status: "claimed" },
      orderBy: { claimedAt: "desc" },
      take: 5,
      include: { account: true },
    }),
  ]);

  const stats = [
    { label: "Total Drivers", value: totalDrivers, sub: `${suspendedDrivers} suspended`, alert: suspendedDrivers > 0 },
    { label: "Compliance Queue", value: pendingDocuments, sub: "pending review", alert: pendingDocuments > 0 },
    { label: "Total Vehicles", value: totalVehicles, sub: "in registry" },
    { label: "Takeover Requests", value: openTakeoverRequests, sub: "pending decision", alert: openTakeoverRequests > 0 },
    { label: "Active Orders", value: activeOrders, sub: "in progress" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">LyPX Admin Console — Phase 1</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${s.alert ? "text-red-400" : "text-white"}`}>
                  {s.value}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {recentClaims.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300">Recent Open Claims (90-day window)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <span className="text-sm text-white">{claim.account.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{claim.claimingPartyType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      expires {formatTZDate(claim.expiryAt, tz)}
                    </span>
                    <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-400">
                      {claim.protectionTier}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
