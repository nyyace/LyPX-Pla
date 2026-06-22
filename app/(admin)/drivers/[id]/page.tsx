import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ComplianceDocumentList } from "@/components/compliance/ComplianceDocumentList";
import { DriverActions } from "@/components/drivers/DriverActions";
import { OnboardingNotifyButtons } from "@/components/drivers/OnboardingNotifyButtons";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";

const statusColors: Record<string, string> = {
  active: "bg-green-900 text-green-300 border-green-700",
  expiring_soon: "bg-yellow-900 text-yellow-300 border-yellow-700",
  suspended: "bg-red-900 text-red-300 border-red-700",
  pending: "bg-gray-800 text-gray-400 border-gray-700",
};

export default async function DriverDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { expiryDate: "asc" } },
      memberships: { include: { tenant: true } },
      vehicleOwnerships: { include: { vehicle: true } },
    },
  });

  if (!driver) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/drivers" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Drivers
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {driver.firstName} {driver.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{driver.phoneNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[driver.complianceStatus]}>
              {driver.complianceStatus.replace("_", " ")}
            </Badge>
            {driver.tier2Qualified && (
              <Badge variant="outline" className="border-blue-700 text-blue-300">Tier 2</Badge>
            )}
            {driver.sourceType === "self_submitted" && (
              <Badge variant="outline" className="border-purple-700 text-purple-300">Self-submitted</Badge>
            )}
          </div>
        </div>
      </div>

      <DriverActions driverId={driver.id} tier2Qualified={driver.tier2Qualified} />

      {driver.sourceType === "self_submitted" && (
        <Card className="bg-gray-900 border-purple-900 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-300">Self-Submitted Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              This driver registered via the public onboarding portal. After reviewing their documents,
              notify them of the outcome via WhatsApp.
            </p>
            <OnboardingNotifyButtons driverId={driver.id} />
          </CardContent>
        </Card>
      )}

      <Separator className="my-6 bg-gray-800" />

      {/* Compliance Documents */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Compliance Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceDocumentList
            documents={driver.documents}
            entityType="driver"
            entityId={driver.id}
            timezone={tz}
          />
        </CardContent>
      </Card>

      {/* Vehicle linkages */}
      {driver.vehicleOwnerships.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Linked Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {driver.vehicleOwnerships.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2">
                  <div>
                    <Link
                      href={`/vehicles/${o.vehicle.id}`}
                      className="text-sm text-white hover:underline"
                    >
                      {o.vehicle.make} {o.vehicle.model} — {o.vehicle.plateNumber}
                    </Link>
                    <p className="text-xs text-gray-500">{o.relationshipType}</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                    {o.vehicle.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operator memberships */}
      {driver.memberships.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Operator Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {driver.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-white">{m.tenant.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                      {m.relationshipType}
                    </Badge>
                    {m.tier1Member && (
                      <Badge variant="outline" className="text-xs border-blue-700 text-blue-300">
                        Tier 1
                      </Badge>
                    )}
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
