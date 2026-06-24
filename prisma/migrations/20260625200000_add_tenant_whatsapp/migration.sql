-- CreateTable: TenantWhatsApp (Stage A — schema only, no data written yet)
CREATE TABLE "TenantWhatsApp" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "wabaId"        TEXT,
  "phoneNumberId" TEXT,
  "displayName"   TEXT,
  "accessToken"   TEXT,
  "qualityRating" TEXT,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "connectedAt"   TIMESTAMP(3),
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TenantWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantWhatsApp_tenantId_key" ON "TenantWhatsApp"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantWhatsApp" ADD CONSTRAINT "TenantWhatsApp_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
