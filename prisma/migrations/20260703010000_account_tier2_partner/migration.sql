-- Fix 3 Step 4: which accounts require a Tier 2 Partner-eligible driver on
-- assignment, independent of which channel booked the job.
ALTER TABLE "Account" ADD COLUMN "tier2PartnerAccount" BOOLEAN NOT NULL DEFAULT false;
