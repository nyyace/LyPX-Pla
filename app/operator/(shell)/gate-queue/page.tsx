import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { GateQueuePanel } from "@/components/lypx/GateQueuePanel";

export default async function OperatorGateQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; status?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);
  const params = await searchParams;
  const entity = params.entity ?? "both";
  const statusFilter = params.status ?? "all";

  // Get all driver IDs in this operator's pool
  const memberships = await prisma.operatorDriverMembership.findMany({
    where: { tenantId: tenant.id },
    select: { driverId: true },
  });
  const driverIds = memberships.map(m => m.driverId);

  // Get vehicle IDs owned by these drivers
  const ownerships = await prisma.vehicleOwnership.findMany({
    where: { driverId: { in: driverIds } },
    select: { vehicleId: true },
  });
  const vehicleIds = ownerships.map(o => o.vehicleId);

  // Fetch relevant compliance docs
  const statusConditions = statusFilter === "suspended"
    ? { driver: { complianceStatus: "suspended" } }
    : statusFilter === "expiring"
    ? { expiryDate: { lte: new Date(Date.now() + 30 * 86400000) }, status: "verified" }
    : statusFilter === "pending"
    ? { status: "pending_review" }
    : {}; // all

  const driverDocs = entity !== "vehicles" ? await prisma.complianceDocument.findMany({
    where: { entityType: "driver", driverId: { in: driverIds }, ...statusConditions },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, complianceStatus: true } },
      file: { select: { fileName: true, mimeType: true } },
    },
    orderBy: { expiryDate: "asc" },
  }) : [];

  const vehicleDocs = entity !== "drivers" ? await prisma.complianceDocument.findMany({
    where: { entityType: "vehicle", vehicleId: { in: vehicleIds }, ...statusConditions },
    include: {
      vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      file: { select: { fileName: true, mimeType: true } },
    },
    orderBy: { expiryDate: "asc" },
  }) : [];

  const suspended = driverDocs.filter(d => d.driver?.complianceStatus === "suspended").length;
  const expiringSoon = [...driverDocs, ...vehicleDocs].filter(d => {
    if (!d.expiryDate) return false;
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7 && d.status === "verified";
  }).length;
  const pendingReview = [...driverDocs, ...vehicleDocs].filter(d => d.status === "pending_review").length;

  return (
    <GateQueuePanel
      driverDocs={driverDocs}
      vehicleDocs={vehicleDocs}
      entity={entity}
      statusFilter={statusFilter}
      suspended={suspended}
      expiringSoon={expiringSoon}
      pendingReview={pendingReview}
      timezone={tz}
      isAdmin={false}
    />
  );
}
