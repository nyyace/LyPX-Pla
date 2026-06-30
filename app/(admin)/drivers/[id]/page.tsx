import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DriverActions } from "@/components/drivers/DriverActions";
import { OnboardingNotifyButtons } from "@/components/drivers/OnboardingNotifyButtons";
import { DriverProfileEditor } from "@/components/drivers/DriverProfileEditor";
import { BondHeroCard, type ActiveBond, type PastBond } from "@/components/drivers/BondHeroCard";
import { InlineDocPanel, type InlineDoc } from "@/components/compliance/InlineDocPanel";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";

const statusColors: Record<string, string> = {
  active:        "bg-green-900 text-green-300 border-green-700",
  expiring_soon: "bg-yellow-900 text-yellow-300 border-yellow-700",
  suspended:     "bg-red-900 text-red-300 border-red-700",
  pending:       "bg-gray-800 text-gray-400 border-gray-700",
};

const DRIVER_REQUIRED_DOCS = [
  { type: "nric",               label: "NRIC / Passport" },
  { type: "driving_licence",    label: "Driving Licence" },
  { type: "vocational_licence", label: "Vocational Licence" },
] as const;

function getDocSummaryStatus(
  docs: Array<{ docType: string; status: string; expiryDate: Date }>,
  docType: string
): "missing" | "pending_review" | "verified" | "expired" | "rejected" | "superseded" {
  const active = docs
    .filter((d) => d.docType === docType && d.status !== "superseded")
    .sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime());
  if (!active.length) return "missing";
  const d = active[0];
  if (d.status === "verified" && d.expiryDate < new Date()) return "expired";
  return d.status as ReturnType<typeof getDocSummaryStatus>;
}

const DOC_STATUS_CHIP: Record<string, string> = {
  verified:       "text-green-300 border-green-800",
  pending_review: "text-yellow-300 border-yellow-800",
  expired:        "text-red-400 border-red-900",
  rejected:       "text-red-400 border-red-900",
  missing:        "text-gray-600 border-gray-700",
};

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  await getUserTimezone(user.id);

  const [driver, activeBondRaw, pastBondsRaw] = await Promise.all([
    prisma.driver.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { expiryDate: "asc" },
          include: { file: { select: { fileName: true, mimeType: true } } },
        },
        memberships: { include: { tenant: true } },
      },
    }),
    prisma.vehicleOwnership.findFirst({
      where: { driverId: id, terminatedAt: null },
      include: {
        vehicle: {
          select: { id: true, plateNumber: true, make: true, model: true, vehicleClass: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vehicleOwnership.findMany({
      where: { driverId: id, terminatedAt: { not: null } },
      include: {
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      },
      orderBy: { terminatedAt: "desc" },
      take: 10,
    }),
  ]);

  if (!driver) notFound();

  // Serialise bond data for client components (Dates → ISO strings)
  const activeBond: ActiveBond | null = activeBondRaw
    ? {
        id:               activeBondRaw.id,
        relationshipType: activeBondRaw.relationshipType as "owned" | "contracted",
        contractStatus:   activeBondRaw.contractStatus,
        contractExpiry:   activeBondRaw.contractExpiry?.toISOString() ?? null,
        verifiedAt:       activeBondRaw.verifiedAt?.toISOString() ?? null,
        verifiedBy:       activeBondRaw.verifiedBy,
        notes:            activeBondRaw.notes,
        vehicle:          activeBondRaw.vehicle,
      }
    : null;

  const pastBonds: PastBond[] = pastBondsRaw.map((b) => ({
    id:               b.id,
    relationshipType: b.relationshipType,
    terminatedAt:     b.terminatedAt?.toISOString() ?? null,
    notes:            b.notes,
    vehicle: {
      id:          b.vehicle.id,
      plateNumber: b.vehicle.plateNumber,
      make:        b.vehicle.make,
      model:       b.vehicle.model,
    },
  }));

  const inlineDocs: InlineDoc[] = driver.documents.map((d) => ({
    id:         d.id,
    docType:    d.docType,
    status:     d.status,
    expiryDate: d.expiryDate.toISOString(),
    issuedDate: d.issuedDate?.toISOString() ?? null,
    hasFile:    !!d.file,
    isPdf:      d.file?.mimeType === "application/pdf",
  }));

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb + header */}
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

      {/* Bond hero card — full width, above two-column grid */}
      <BondHeroCard driverId={driver.id} activeBond={activeBond} pastBonds={pastBonds} />

      {/* Two-column: profile left, documents right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Profile editor + memberships */}
        <div className="space-y-6">
          <DriverProfileEditor
            driverId={driver.id}
            firstName={driver.firstName}
            lastName={driver.lastName}
            phoneNumber={driver.phoneNumber}
            licenseNumber={driver.licenseNumber}
            licenseIssuedDate={driver.licenseIssuedDate?.toISOString() ?? null}
            complianceStatus={driver.complianceStatus}
            statusOverriddenAt={driver.statusOverriddenAt?.toISOString() ?? null}
            tier2Qualified={driver.tier2Qualified}
          />

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

        {/* Right: Compliance documents */}
        <div>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-300">Compliance Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Required docs checklist */}
              {(() => {
                const statuses = DRIVER_REQUIRED_DOCS.map((r) => ({
                  ...r,
                  status: getDocSummaryStatus(driver.documents, r.type),
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
                upload={{ entityType: "driver", entityId: driver.id }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
