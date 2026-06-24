-- Migration: add_platform_config
-- Adds PlatformConfig table for admin-managed settings (marketplace take rate, floor rate).
-- Adds fee breakdown + rate snapshot columns to Order for LyPX Direct trips.

-- CreateTable PlatformConfig
CREATE TABLE "PlatformConfig" (
    "id"          TEXT        NOT NULL,
    "key"         TEXT        NOT NULL,
    "value"       TEXT        NOT NULL,
    "description" TEXT        NOT NULL,
    "updatedBy"   TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");

-- AlterTable Order — marketplace fee snapshot columns (nullable, non-marketplace orders leave these null)
ALTER TABLE "Order"
    ADD COLUMN "tripFare"          DOUBLE PRECISION,
    ADD COLUMN "lypxFee"           DOUBLE PRECISION,
    ADD COLUMN "operatorReceives"  DOUBLE PRECISION,
    ADD COLUMN "rateApplied"       TEXT,
    ADD COLUMN "takeRateSnapshot"  DOUBLE PRECISION,
    ADD COLUMN "floorRateSnapshot" DOUBLE PRECISION;
