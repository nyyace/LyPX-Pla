-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "statusOverriddenAt" TIMESTAMP(3),
ADD COLUMN     "statusOverriddenBy" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "statusOverriddenAt" TIMESTAMP(3),
ADD COLUMN     "statusOverriddenBy" TEXT;
