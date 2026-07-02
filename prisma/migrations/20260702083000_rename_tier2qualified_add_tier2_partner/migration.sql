-- "tier2Qualified" has meant Tier 3 / Central Pool eligibility everywhere in the
-- codebase since an earlier design phase — rename it to match reality before
-- introducing a genuinely distinct Tier 2 (Partner) field, so the two aren't
-- confusable.
ALTER TABLE "Driver" RENAME COLUMN "tier2Qualified" TO "centralPoolEligible";

ALTER TABLE "Driver" ADD COLUMN "tier2PartnerEligible" BOOLEAN NOT NULL DEFAULT false;
