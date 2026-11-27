-- Admin pro controls: timed suspensions, optional reason, and account-erasure tombstones.
-- Additive only (nullable columns + index). No drops, no rewrites of existing rows.
-- Safe to apply to staging. Production uses supabase/production/20261201_admin_pro_controls.sql
-- and must wait for the owner's approval.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment') THEN
    RAISE EXCEPTION 'This is the staging migration; production uses supabase/production/20261201_admin_pro_controls.sql';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX IF NOT EXISTS "User_suspendedUntil_idx" ON "User"("suspendedUntil");
