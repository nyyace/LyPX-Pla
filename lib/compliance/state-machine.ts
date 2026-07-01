import { prisma } from "@/lib/prisma";
import { addDays, isExpired, isWithinDays, yearsSince } from "@/lib/utils/date";

const EXPIRING_SOON_DAYS = 30;

// Evaluates compliance status for a single driver based on their documents.
// Returns the new status without writing — callers decide whether to persist.
//
// Per-document-type rules:
//   nric             — identity only; no date-based checks
//   driving_licence  — issuedDate must be >= 2 years ago (experience gate)
//   vocational_licence — expiryDate must be future; expiring_soon within 30 days
export function deriveDriverStatus(
  docs: Array<{ status: string; expiryDate: Date | null; issuedDate: Date | null; docType: string }>
): "active" | "expiring_soon" | "suspended" | "pending" {
  const active = docs.filter((d) => d.status !== "superseded");
  if (active.length === 0) return "pending";

  // Any rejected document → suspended
  if (active.some((d) => d.status === "rejected")) return "suspended";

  // Driving licence: minimum 2 years of experience (issuedDate gate)
  const hasInsufficientExperience = active.some(
    (d) =>
      d.docType === "driving_licence" &&
      d.status === "verified" &&
      yearsSince(d.issuedDate) < 2
  );
  if (hasInsufficientExperience) return "suspended";

  // Vocational licence: check expiry (NRIC and driving_licence excluded)
  const vocLicences = active.filter((d) => d.docType === "vocational_licence");
  if (vocLicences.some((d) => d.status === "verified" && isExpired(d.expiryDate))) {
    return "suspended";
  }
  if (vocLicences.some(
    (d) =>
      d.status === "verified" &&
      !isExpired(d.expiryDate) &&
      isWithinDays(d.expiryDate, EXPIRING_SOON_DAYS)
  )) {
    return "expiring_soon";
  }

  const allVerified = active.every((d) => d.status === "verified");
  if (allVerified) return "active";

  return "pending";
}

// Derives vehicle status from its own docs and the compliance status of its primary driver(s).
export function deriveVehicleStatus(
  vehicleDocs: Array<{ status: string; expiryDate: Date | null }>,
  driverStatuses: string[]
): "active" | "inactive" | "suspended" {
  const activeDocs = vehicleDocs.filter((d) => d.status !== "superseded");
  const hasExpiredDoc = activeDocs.some(
    (d) => d.status === "verified" && isExpired(d.expiryDate)
  );
  const hasRejectedDoc = activeDocs.some((d) => d.status === "rejected");
  const primaryDriverSuspended = driverStatuses.some((s) => s === "suspended");

  if (hasExpiredDoc || hasRejectedDoc || primaryDriverSuspended)
    return "suspended";

  const allDocsVerified = activeDocs.every((d) => d.status === "verified");
  const allDriversActive = driverStatuses.every(
    (s) => s === "active" || s === "expiring_soon"
  );

  if (allDocsVerified && allDriversActive) return "active";

  return "inactive";
}

// Re-evaluates a driver's compliance status and persists if changed.
// Writes audit log on status change. Safe to call from scheduler or on-demand.
// Skips if a manual status override is active (statusOverriddenAt is set).
export async function evaluateAndSyncDriverCompliance(
  driverId: string,
  actorId = "system"
): Promise<void> {
  const driver = await prisma.driver.findUniqueOrThrow({
    where: { id: driverId },
    include: { documents: true },
  });

  if (driver.statusOverriddenAt) return;

  const newStatus = deriveDriverStatus(driver.documents);

  if (newStatus === driver.complianceStatus) return;

  await prisma.$transaction([
    prisma.driver.update({
      where: { id: driverId },
      data: { complianceStatus: newStatus },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: driverId,
        action: `driver_status_changed`,
        actorId,
        metadata: {
          from: driver.complianceStatus,
          to: newStatus,
        },
      },
    }),
  ]);

  // When driver status changes, cascade to vehicles they own/operate
  const ownerships = await prisma.vehicleOwnership.findMany({
    where: { driverId },
  });
  for (const o of ownerships) {
    await evaluateAndSyncVehicleCompliance(o.vehicleId, actorId);
  }
}

// Re-evaluates a vehicle's compliance status and persists if changed.
// Skips if a manual status override is active (statusOverriddenAt is set).
export async function evaluateAndSyncVehicleCompliance(
  vehicleId: string,
  actorId = "system"
): Promise<void> {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: vehicleId },
    include: {
      documents: true,
      ownership: {
        include: { driver: true },
      },
    },
  });

  if (vehicle.statusOverriddenAt) return;

  const driverStatuses = vehicle.ownership.map((o) => o.driver.complianceStatus);
  const newStatus = deriveVehicleStatus(vehicle.documents, driverStatuses);

  if (newStatus === vehicle.status) return;

  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: newStatus },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: vehicleId,
        action: "vehicle_status_changed",
        actorId,
        metadata: {
          from: vehicle.status,
          to: newStatus,
        },
      },
    }),
  ]);
}

// Full sweep — run nightly at 16:00 UTC (00:00 SGT).
export async function runComplianceSweep(): Promise<void> {
  const drivers = await prisma.driver.findMany({ select: { id: true } });
  for (const d of drivers) {
    await evaluateAndSyncDriverCompliance(d.id, "system");
  }
  const vehicles = await prisma.vehicle.findMany({ select: { id: true } });
  for (const v of vehicles) {
    await evaluateAndSyncVehicleCompliance(v.id, "system");
  }
}
