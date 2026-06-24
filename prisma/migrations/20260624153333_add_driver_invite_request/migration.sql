-- AlterTable
ALTER TABLE "PlatformConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "DriverInviteRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverWhatsapp" TEXT NOT NULL,
    "driverName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverInviteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverInviteRequest_tenantId_status_idx" ON "DriverInviteRequest"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "DriverInviteRequest" ADD CONSTRAINT "DriverInviteRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
