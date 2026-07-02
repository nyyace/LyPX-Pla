-- Enforce at most one active (verified | pending_review) ComplianceDocument per
-- driver+docType and per vehicle+docType at the DB level. Application-logic supersede
-- checks have failed silently on more than one creation path — this makes it
-- structurally impossible regardless of code path.
CREATE UNIQUE INDEX "ComplianceDocument_driver_docType_active_unique"
  ON "ComplianceDocument" ("driverId", "docType")
  WHERE "status" IN ('verified', 'pending_review') AND "driverId" IS NOT NULL;

CREATE UNIQUE INDEX "ComplianceDocument_vehicle_docType_active_unique"
  ON "ComplianceDocument" ("vehicleId", "docType")
  WHERE "status" IN ('verified', 'pending_review') AND "vehicleId" IS NOT NULL;
