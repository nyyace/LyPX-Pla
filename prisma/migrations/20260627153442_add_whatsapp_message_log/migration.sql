-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "messageType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL DEFAULT 'unknown',
    "recipientPhone" TEXT NOT NULL,
    "wamid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "pricingModel" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessageLog_wamid_key" ON "WhatsAppMessageLog"("wamid");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_tenantId_sentAt_idx" ON "WhatsAppMessageLog"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_orderId_idx" ON "WhatsAppMessageLog"("orderId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_billable_sentAt_idx" ON "WhatsAppMessageLog"("billable", "sentAt");

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
