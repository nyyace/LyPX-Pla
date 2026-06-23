-- Migration: add_driver_submission_r2
-- Removes blob storage from DocumentFile, adds R2 storageKey, adds DriverSubmission model.
-- Existing DocumentFile rows contain dev/test blobs that are no longer valid after R2 migration.
DELETE FROM "DocumentFile";

-- AlterTable: drop blob column, add R2 key column
ALTER TABLE "DocumentFile" DROP COLUMN "data";
ALTER TABLE "DocumentFile" ADD COLUMN "storageKey" TEXT NOT NULL DEFAULT '';

-- Remove the placeholder default so future inserts must supply an explicit key
ALTER TABLE "DocumentFile" ALTER COLUMN "storageKey" DROP DEFAULT;

-- CreateTable: DriverSubmission
CREATE TABLE "DriverSubmission" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" TEXT NOT NULL,
    "nricNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehiclePlate" TEXT,
    "vehicleRelationship" TEXT,
    "adminNotes" TEXT,
    "flagReason" TEXT,
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DriverSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverSubmission_driverId_key" ON "DriverSubmission"("driverId");

-- AddForeignKey
ALTER TABLE "DriverSubmission" ADD CONSTRAINT "DriverSubmission_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
