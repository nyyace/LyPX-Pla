import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { VehicleProfileEditor } from "@/components/vehicles/VehicleProfileEditor";
import { InlineDocPanel, type InlineDoc } from "@/components/compliance/InlineDocPanel";
import { VehicleAssignmentsPanel, type AssignmentRow } from "@/components/vehicles/VehicleAssignmentsPanel";
import { VehicleActions } from "@/components/vehicles/VehicleActions";

const statusColors: Record<string, string> = {
  active:   "bg-green-900 text-green-300 border-green-700",
  inactive: "bg-gray-800 text-gray-400 border-gray-700",
  suspended:"bg-red-900 text-red-300 border-red-700",
};

function getDocSummaryStatus(
  docs: Array<{ docType: string; status: string; expiryDate: Date | null }>,
  docType: string
): "missing" | "pending_review" | "verified" | "expired" | "rejected" {
  const active = docs
    .filter((d) => d.docType === docType && d.status !== "superseded")
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return b.expiryDate.getTime() - a.expiryDate.getTime();
    });
  if (!active.length) return "missing";
  const d = active[0];
  if (d.status === "verified" && d.expiryDate && d.expiryDate < new Date()) return "expired";
  return d.status as ReturnType<typeof getDocSummaryStatus>;
}

const DOC_STATUS_CHIP: Record<string, string> = {
  verified:       "text-green-300 border-green-800",
  pending_review: "text-yellow-300 border-yellow-800",
  expired:        "text-red-400 border-red-900",
  rejected:       "text-red-400 border-red-900",
  missing:        "text-gray-600 border-gray-700",
};

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  await getUserTimezone(user.id);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { expiryDate: "asc" },
        include: { file: { select: { fileName: true, mimeType: true } } },
      },
      ownership: {
        orderBy: { createdAt: "desc" },
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!vehicle) notFound();

  const inlineDocs: InlineDoc[] = vehicle.documents.map((d) => ({
    id:              d.id,
    docType:         d.docType,
    status:          d.status,
    expiryDate:      d.expiryDate?.toISOString() ?? null,
    issuedDate:      d.issuedDate?.toISOString() ?? null,
    referenceNumber: null,
    hasFile:         !!d.file,
    isPdf:           d.file?.mimeType === "application/pdf",
    supersededAt:    d.supersededAt?.toISOString() ?? null,
  }));

  const assignments: AssignmentRow[] = vehicle.ownership.map((o) => ({
    id:               o.id,
    driverId:         o.driver.id,
    driverName:       `${o.driver.firstName} ${o.driver.lastName}`,
    vehicleId:        vehicle.id,
    vehiclePlate:     vehicle.plateNumber,
    vehicleMake:      vehicle.make,
    vehicleModel:     vehicle.model,
    vehicleClass:     vehicle.vehicleClass,
    relationshipType: o.relationshipType,
    contractStatus:   o.contractStatus,
    contractExpiry:   o.contractExpiry?.toISOString() ?? null,
    verifiedAt:       o.verifiedAt?.toISOString() ?? null,
    terminatedAt:     o.terminatedAt?.toISOString() ?? null,
    notes:            o.notes,
  }));

  return (
    <div className="p-8 max-w-4xl">
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
          Status is auto-derived from compliance documents and driver status. Use the override below for manual corrections.
        </p>
      </div>

      <VehicleActions vehicleId={vehicle.id} />

      <Separator className="my-6 bg-gray-800" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Vehicle details editor */}
        <div className="space-y-6">
          <VehicleProfileEditor
            vehicleId={vehicle.id}
            make={vehicle.make}
            model={vehicle.model}
            year={vehicle.year}
            colour={vehicle.colour}
            vehicleClass={vehicle.vehicleClass}
            seatingCapacity={vehicle.seatingCapacity}
            insuranceCompany={vehicle.insuranceCompany}
            currentStatus={vehicle.status}
            statusOverriddenAt={vehicle.statusOverriddenAt?.toISOString() ?? null}
          />
        </div>

        {/* Right: Documents + Driver assignments */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-300 mb-3">Compliance Documents</p>
            {/* Required docs checklist */}
            {(() => {
              const hasContractedBond = vehicle.ownership.some(
                (o) => o.relationshipType === "contracted" && !o.terminatedAt
              );
              const required = [
                { type: "insurance", label: "Insurance Certificate" },
                ...(hasContractedBond ? [{ type: "rental_agreement", label: "Rental Agreement" }] : []),
              ];
              const statuses = required.map((r) => ({
                ...r,
                status: getDocSummaryStatus(vehicle.documents, r.type),
              }));
              const allVerified = statuses.every((s) => s.status === "verified");
              return (
                <div className={`mb-4 p-3 rounded border text-xs ${allVerified ? "border-green-900/40 bg-green-950/20" : "border-amber-800/50 bg-amber-950/20"}`}>
                  <p className={`font-medium mb-2 ${allVerified ? "text-green-400" : "text-amber-400"}`}>
                    {allVerified ? "✓ All required documents verified" : "⚠ Required documents"}
                  </p>
                  <div className="space-y-1">
                    {statuses.map((s) => (
                      <div key={s.type} className="flex items-center justify-between">
                        <span className="text-gray-400">{s.label}</span>
                        <span className={`border rounded px-1.5 py-0 text-xs ${DOC_STATUS_CHIP[s.status] ?? DOC_STATUS_CHIP.missing}`}>
                          {s.status === "missing" ? "— missing" : s.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <InlineDocPanel
              docs={inlineDocs}
              upload={{ entityType: "vehicle", entityId: vehicle.id }}
            />
          </div>

          <VehicleAssignmentsPanel
            assignments={assignments}
            entityType="vehicle"
            entityId={vehicle.id}
          />
        </div>
      </div>
    </div>
  );
}
