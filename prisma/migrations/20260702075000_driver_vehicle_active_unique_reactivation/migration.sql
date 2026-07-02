-- Entity reactivation (Path B): a soft-deleted driver/vehicle currently blocks
-- re-registration under the same identity/plate at the DB level, with no way to
-- distinguish "reactivatable" from "genuine conflict". Replace the plain unique
-- index with one scoped to active (non-deleted) rows only — deleted rows no
-- longer collide, and application logic decides whether to offer reactivation.
DROP INDEX "Driver_identityHash_key";
CREATE UNIQUE INDEX "Driver_identityHash_active_unique"
  ON "Driver" ("identityHash")
  WHERE "deletedAt" IS NULL;

DROP INDEX "Vehicle_plateNumber_key";
CREATE UNIQUE INDEX "Vehicle_plateNumber_active_unique"
  ON "Vehicle" ("plateNumber")
  WHERE "deletedAt" IS NULL;
