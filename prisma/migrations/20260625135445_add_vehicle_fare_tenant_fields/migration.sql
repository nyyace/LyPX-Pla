-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "fareAmount" DOUBLE PRECISION,
ADD COLUMN     "fareCurrency" TEXT DEFAULT 'SGD',
ADD COLUMN     "fareNote" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "driverLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "planTier" TEXT NOT NULL DEFAULT 'starter';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "colour" TEXT,
ADD COLUMN     "seatingCapacity" INTEGER,
ADD COLUMN     "year" INTEGER;
