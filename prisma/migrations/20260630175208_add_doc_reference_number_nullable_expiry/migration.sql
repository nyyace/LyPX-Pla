-- AlterTable
ALTER TABLE "ComplianceDocument" ADD COLUMN     "referenceNumber" TEXT,
ALTER COLUMN "expiryDate" DROP NOT NULL;
