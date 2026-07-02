-- Track when/by whom a document was superseded, so the detail view can show
-- "Superseded — document purged [date]" instead of a stale/missing-file state.
ALTER TABLE "ComplianceDocument" ADD COLUMN "supersededAt" TIMESTAMP(3);
ALTER TABLE "ComplianceDocument" ADD COLUMN "supersededBy" TEXT;
