-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT,
    "direction" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT,
    "templateName" TEXT,
    "waMessageId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_direction_isRead_idx" ON "WhatsAppMessage"("tenantId", "direction", "isRead");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_from_idx" ON "WhatsAppMessage"("tenantId", "from");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_to_idx" ON "WhatsAppMessage"("tenantId", "to");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
