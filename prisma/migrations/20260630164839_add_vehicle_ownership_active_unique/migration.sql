-- Enforce at most one active bond per vehicle at the DB level.
-- Prisma doesn't support partial unique indexes natively, so this is raw SQL.
CREATE UNIQUE INDEX "VehicleOwnership_vehicleId_active_unique"
  ON "VehicleOwnership" ("vehicleId")
  WHERE "terminatedAt" IS NULL;

-- Also enforce at most one active bond per driver.
CREATE UNIQUE INDEX "VehicleOwnership_driverId_active_unique"
  ON "VehicleOwnership" ("driverId")
  WHERE "terminatedAt" IS NULL;
