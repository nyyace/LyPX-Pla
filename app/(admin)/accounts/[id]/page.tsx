import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

export default async function AccountDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      claims: { orderBy: { claimedAt: "desc" } },
      takeoverRequests: { orderBy: { requestedAt: "desc" }, take: 5 },
      orders: {
        orderBy: { pickupTime: "desc" },
        take: 10,
        include: {
          driver: { select: { firstName: true, lastName: true } },
          vehicle: { select: { plateNumber: true } },
        },
      },
    },
  });

  if (!account) notFound();

  const activeClaim = account.claims.find(
    (c) => c.status === "claimed" || c.status === "won"
  );

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/accounts" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Accounts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{account.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {account.customerSegment.replace("_", " ")} · {account.sourceType === "lypx_sourced" ? "LyPX Direct" : "Operator Sourced"}
            </p>
          </div>
          {activeClaim && (
            <Badge
              variant="outline"
              className={`${
                activeClaim.status === "won"
                  ? "border-green-700 text-green-300"
                  : "border-yellow-700 text-yellow-300"
              }`}
            >
              {activeClaim.status === "won" ? "Won" : "Claimed"}
            </Badge>
          )}
        </div>
      </div>

      {/* Active Claim */}
      {activeClaim && (
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Active Claim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Claiming party</span>
              <span className="text-white">{activeClaim.claimingPartyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Claimed</span>
              <span className="text-white">{format(new Date(activeClaim.claimedAt), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">90-day window expires</span>
              <span className={new Date(activeClaim.expiryAt) < new Date() ? "text-red-400" : "text-white"}>
                {format(new Date(activeClaim.expiryAt), "dd MMM yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Protection tier</span>
              <Badge variant="outline" className={`text-xs ${activeClaim.protectionTier === "long_term" ? "border-blue-700 text-blue-300" : "border-gray-700 text-gray-400"}`}>
                {activeClaim.protectionTier}
              </Badge>
            </div>
            {activeClaim.wonAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Won on</span>
                <span className="text-white">{format(new Date(activeClaim.wonAt), "dd MMM yyyy")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {account.orders.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {account.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <Link href={`/orders/${o.id}`} className="text-sm text-white hover:underline">
                      {format(new Date(o.pickupTime), "dd MMM yyyy HH:mm")}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {o.driver ? `${o.driver.firstName} ${o.driver.lastName}` : "Unassigned"} ·{" "}
                      {o.vehicle?.plateNumber ?? "No vehicle"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      o.status === "completed"
                        ? "border-green-700 text-green-300"
                        : o.status === "cancelled"
                        ? "border-red-700 text-red-300"
                        : "border-gray-700 text-gray-400"
                    }`}
                  >
                    {o.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Takeover History */}
      {account.takeoverRequests.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Takeover Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {account.takeoverRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2">
                  <div>
                    <Link href={`/takeover-requests/${r.id}`} className="text-sm text-white hover:underline">
                      {r.requestingPartyType} requesting from {r.currentOwnerType}
                    </Link>
                    <p className="text-xs text-gray-500">{format(new Date(r.requestedAt), "dd MMM yyyy")}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      r.status === "approved" ? "border-green-700 text-green-300" :
                      r.status === "denied" ? "border-red-700 text-red-300" :
                      "border-yellow-700 text-yellow-300"
                    }`}
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
