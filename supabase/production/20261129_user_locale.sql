-- English language support: production rollout (NOT applied; apply only after the owner approves shipping English to main).
-- Same additive body as supabase/staging/user-locale.sql. Apply BEFORE the code that reads User."locale" reaches main.
-- Additive only: one nullable column User."locale" ('sq' | 'en' | NULL) plus a CHECK constraint; no existing row is rewritten.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment') THEN
    RAISE EXCEPTION 'This is the production rollout; staging uses supabase/staging/user-locale.sql';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'IdVerification') THEN
    RAISE EXCEPTION 'Apply 20261128_id_verification.sql first';
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
