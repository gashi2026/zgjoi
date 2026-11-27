-- Admin pro controls: timed suspensions, optional reason, and account-erasure tombstones.
-- NOT applied. Apply only after the owner approves shipping this to production, with a backup first,
-- and BEFORE the code that uses these columns reaches main.
-- Same body as supabase/staging/admin-pro-controls.sql (minus the staging guard).
-- Additive: nullable User."suspendedUntil", User."suspensionReason", User."deletedAt", plus indexes.
-- No existing row is updated or deleted.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment') THEN
    RAISE EXCEPTION 'This is the production rollout; staging uses supabase/staging/admin-pro-controls.sql';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX IF NOT EXISTS "User_suspendedUntil_idx" ON "User"("suspendedUntil");
