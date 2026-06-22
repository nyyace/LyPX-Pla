-- AlterTable
ALTER TABLE "ComplianceDocument" ADD COLUMN     "issuedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "licenseIssuedDate" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "insuranceCompany" TEXT;

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "complianceDocumentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFile_complianceDocumentId_key" ON "DocumentFile"("complianceDocumentId");

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_complianceDocumentId_fkey" FOREIGN KEY ("complianceDocumentId") REFERENCES "ComplianceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
