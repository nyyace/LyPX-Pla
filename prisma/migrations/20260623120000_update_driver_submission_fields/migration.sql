-- Migration: update_driver_submission_fields
-- Replaces fullName/licenceNumber with split name + full credential fields.
-- Existing rows are dev/test data — truncate before altering.
TRUNCATE TABLE "DriverSubmission";

ALTER TABLE "DriverSubmission" DROP COLUMN "fullName";
ALTER TABLE "DriverSubmission" DROP COLUMN "licenceNumber";

ALTER TABLE "DriverSubmission"
  ADD COLUMN "firstName"                   TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastName"                    TEXT NOT NULL DEFAULT '',
  ADD COLUMN "drivingLicenceNumber"        TEXT NOT NULL DEFAULT '',
  ADD COLUMN "drivingLicenceIssuedDate"    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN "vocationalLicenceNumber"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN "vocationalLicenceExpiryDate" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Drop temporary defaults so future inserts must supply explicit values
ALTER TABLE "DriverSubmission"
  ALTER COLUMN "firstName"                   DROP DEFAULT,
  ALTER COLUMN "lastName"                    DROP DEFAULT,
  ALTER COLUMN "drivingLicenceNumber"        DROP DEFAULT,
  ALTER COLUMN "drivingLicenceIssuedDate"    DROP DEFAULT,
  ALTER COLUMN "vocationalLicenceNumber"     DROP DEFAULT,
  ALTER COLUMN "vocationalLicenceExpiryDate" DROP DEFAULT;
