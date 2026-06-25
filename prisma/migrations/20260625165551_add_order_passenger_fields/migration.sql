-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "passengerName" TEXT,
ADD COLUMN     "passengerWhatsapp" TEXT,
ADD COLUMN     "sameAsRequestor" BOOLEAN NOT NULL DEFAULT false;
