-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "deletedAt" TIMESTAMP(3);
