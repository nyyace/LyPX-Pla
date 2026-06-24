-- AlterTable
ALTER TABLE "TenantPreference" ADD COLUMN     "logoKey" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
