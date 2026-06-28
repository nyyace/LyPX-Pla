-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "accountType" TEXT NOT NULL DEFAULT 'business_entity';

-- CreateTable
CREATE TABLE "AccountUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountUser_userId_idx" ON "AccountUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountUser_userId_accountId_key" ON "AccountUser"("userId", "accountId");

-- AddForeignKey
ALTER TABLE "AccountUser" ADD CONSTRAINT "AccountUser_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
