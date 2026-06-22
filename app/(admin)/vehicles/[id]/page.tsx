import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ComplianceDocumentList } from "@/components/compliance/ComplianceDocumentList";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { formatTZDate } from "@/lib/utils/date";

const statusColors: Record<string, string> = {
  active: "bg-green-900 text-green-300 border-green-700",
  inactive: "bg-gray-800 text-gray-400 border-gray-700",
  suspended: "bg-red-900 text-red-300 border-red-700",
};

export default async function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { expiryDate: "asc" } },
      ownership: {
        include: { driver: true },
      },
    },
  });

  if (!vehicle) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/vehicles" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Vehicles
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white font-mono">
              {vehicle.plateNumber}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {vehicle.make} {vehicle.model}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[vehicle.status]}>
            {vehicle.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Status is derived from compliance documents and driver status — not directly editable.
        </p>
      </div>

      {/* Compliance Documents */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Compliance Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceDocumentList
            documents={vehicle.documents}
            entityType="vehicle"
            entityId={vehicle.id}
            timezone={tz}
          />
        </CardContent>
      </Card>

      {/* Owner/Driver Linkages */}
      {vehicle.ownership.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Driver Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicle.ownership.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <Link
                      href={`/drivers/${o.driver.id}`}
                      className="text-sm text-white hover:underline"
                    >
                      {o.driver.firstName} {o.driver.lastName}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {o.relationshipType}
                      {o.contractExpiry && ` · expires ${formatTZDate(o.contractExpiry, tz)}`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      o.driver.complianceStatus === "active"
                        ? "border-green-700 text-green-300"
                        : o.driver.complianceStatus === "suspended"
                        ? "border-red-700 text-red-300"
                        : "border-gray-700 text-gray-400"
                    }`}
                  >
                    driver: {o.driver.complianceStatus}
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
