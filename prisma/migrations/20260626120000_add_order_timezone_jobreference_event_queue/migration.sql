-- Add timezone field to Order (IANA string, default SGT)
ALTER TABLE "Order" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Singapore';

-- Add jobReference field to Order (nullable, unique)
ALTER TABLE "Order" ADD COLUMN "jobReference" TEXT;
CREATE UNIQUE INDEX "Order_jobReference_key" ON "Order"("jobReference");

-- Create EventQueue model for notification orchestrator
CREATE TABLE "EventQueue" (
    "id"          TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "payload"     JSONB NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "lastError"   TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventQueue_status_attempts_idx" ON "EventQueue"("status", "attempts");
CREATE INDEX "EventQueue_createdAt_idx" ON "EventQueue"("createdAt");
