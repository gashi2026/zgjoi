-- English language support — additive, staging-first upgrade.
-- Adds User."locale" (nullable; 'sq' or 'en'; NULL = never chosen, Albanian is used) for the saved site/email language.
-- Additive only: one nullable column plus a CHECK constraint; no existing row is rewritten.
-- Production (pfckeaicvexyaybptgfn) uses supabase/production/20261129_user_locale.sql; this guard refuses it.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment' AND value->>'kind' = 'staging') THEN
    RAISE EXCEPTION 'This migration requires the dedicated staging marker';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'IdVerification') THEN
    RAISE EXCEPTION 'Apply id-verification.sql first';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT;
DO $c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_locale_check') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_locale_check" CHECK ("locale" IS NULL OR "locale" IN ('sq', 'en'));
  END IF;
END
$c$;
