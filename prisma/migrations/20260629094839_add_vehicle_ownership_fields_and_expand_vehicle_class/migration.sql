-- AlterTable
ALTER TABLE "VehicleOwnership" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "terminatedAt" TIMESTAMP(3),
ADD COLUMN     "terminatedBy" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;
