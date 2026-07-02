import type { TxClient } from "@/lib/prisma";

// Reactivation (Path B): preserves the original row's id, compliance document
// history, trip/order history, and audit trail. Does NOT restore old
// VehicleOwnership bonds — those stay terminated; an admin creates a new bond
// explicitly. Forces fresh compliance verification (driver -> pending,
// vehicle -> inactive) rather than trusting stale pre-deletion state.

export async function reactivateDriver(
  tx: TxClient,
  driverId: string,
  actorId: string,
  updates: Partial<{ firstName: string; lastName: string; phoneNumber: string; licenseNumber: string; licenseIssuedDate: Date | null; centralPoolEligible: boolean; sourceType: string }>
) {
  const driver = await tx.driver.update({
    where: { id: driverId },
    data: {
      deletedAt: null,
      complianceStatus: "pending",
      statusOverriddenAt: null,
      statusOverriddenBy: null,
      ...updates,
    },
  });

  await tx.auditLog.create({
    data: {
      entityType: "driver",
      entityId: driverId,
      action: "driver.reactivated",
      actorId,
      metadata: { updates },
    },
  });

  return driver;
}

export async function reactivateVehicle(
  tx: TxClient,
  vehicleId: string,
  actorId: string,
  updates: Partial<{ make: string; model: string; year: number | null; colour: string | null; seatingCapacity: number | null; insuranceCompany: string | null; vehicleClass: string | null }>
) {
  const vehicle = await tx.vehicle.update({
    where: { id: vehicleId },
    data: {
      deletedAt: null,
      status: "inactive",
      statusOverriddenAt: null,
      statusOverriddenBy: null,
      ...updates,
    },
  });

  await tx.auditLog.create({
    data: {
      entityType: "vehicle",
      entityId: vehicleId,
      action: "vehicle.reactivated",
      actorId,
      metadata: { updates },
    },
  });

  return vehicle;
}
