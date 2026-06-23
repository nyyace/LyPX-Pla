-- Migration: add_tenant_onboarding_fields
-- Adds contact info, lifecycle status, and WorkOS org tracking to Tenant.
-- Existing tenants are already active — default status = 'active'.
ALTER TABLE "Tenant"
  ADD COLUMN "contactName"          TEXT,
  ADD COLUMN "contactEmail"         TEXT,
  ADD COLUMN "contactPhone"         TEXT,
  ADD COLUMN "status"               TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "workosOrganisationId" TEXT,
  ADD COLUMN "workosInvitationId"   TEXT,
  ADD COLUMN "invitedAt"            TIMESTAMP(3),
  ADD COLUMN "activatedAt"          TIMESTAMP(3);
