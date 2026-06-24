-- Migration: add_uen_claim_conflict
-- Adds Singapore UEN to Account, vehicleClass to Vehicle,
-- and ClaimConflict table for admin-mediated duplicate UEN resolution.

-- Add UEN unique field to Account
ALTER TABLE "Account" ADD COLUMN "uen" TEXT;
CREATE UNIQUE INDEX "Account_uen_key" ON "Account"("uen");

-- Add vehicle class to Vehicle
ALTER TABLE "Vehicle" ADD COLUMN "vehicleClass" TEXT;

-- Create ClaimConflict table
CREATE TABLE "ClaimConflict" (
    "id"                  TEXT         NOT NULL,
    "accountId"           TEXT         NOT NULL,
    "existingClaimId"     TEXT         NOT NULL,
    "challengerTenantId"  TEXT         NOT NULL,
    "challengerNote"      TEXT,
    "status"              TEXT         NOT NULL DEFAULT 'pending',
    "adminDecision"       TEXT,
    "decidedBy"           TEXT,
    "decidedAt"           TIMESTAMP(3),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimConflict_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClaimConflict_accountId_idx" ON "ClaimConflict"("accountId");
CREATE INDEX "ClaimConflict_status_idx" ON "ClaimConflict"("status");

ALTER TABLE "ClaimConflict"
    ADD CONSTRAINT "ClaimConflict_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
