-- Sign-up rework (ID inside sign-up, several professions per pro, no prices at sign-up): production rollout.
-- NOT applied. Apply only after the owner approves shipping this to main, with a backup first, and BEFORE the code reaches main.
-- Same body as supabase/staging/pro-categories-signup.sql.
-- Additive: new table "ProCategory" (RLS on) backfilled from ProProfile."categorySlug"/"priceFrom", new nullable User."signupStep",
-- ProCategory."minMinutes" (minimum hours per profession), and ProProfile."priceFrom" becomes nullable. No existing row is updated or deleted.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment') THEN
    RAISE EXCEPTION 'This is the production rollout; staging uses supabase/staging/pro-categories-signup.sql';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'locale') THEN
    RAISE EXCEPTION 'Apply 20261129_user_locale.sql first';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;

-- 1) Sign-up wizard: a new account that has not uploaded its ID yet ("ID"). Existing rows stay NULL,
--    so existing users keep today's banner + /verifikimi flow and are never pulled back into the wizard.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupStep" TEXT;
DO $c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_signupStep_check') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_signupStep_check" CHECK ("signupStep" IS NULL OR "signupStep" IN ('ID'));
  END IF;
END
$c$;

-- 2) Prices are no longer asked at sign-up: a pro without a price shows "ask for a price".
--    Relaxes NOT NULL only; every existing value is kept.
ALTER TABLE "ProProfile" ALTER COLUMN "priceFrom" DROP NOT NULL;

-- 3) Several professions per pro, each with its own optional "price from" and its own approval.
CREATE TABLE IF NOT EXISTS "ProCategory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "priceFromCents" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProCategory_priceFromCents_check" CHECK ("priceFromCents" IS NULL OR ("priceFromCents" >= 1 AND "priceFromCents" <= 10000000))
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProCategory_profileId_categorySlug_key" ON "ProCategory"("profileId", "categorySlug");
CREATE INDEX IF NOT EXISTS "ProCategory_categorySlug_approvedAt_idx" ON "ProCategory"("categorySlug", "approvedAt");
DO $fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProCategory_profileId_fkey') THEN
    ALTER TABLE "ProCategory" ADD CONSTRAINT "ProCategory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$fk$;
-- Custom server sessions: browser Data API roles have no access to application tables.
ALTER TABLE public."ProCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ProCategory" FROM anon, authenticated;

-- 4) Backfill: every existing pro keeps their single category as their first profession, with their
--    current price, approved if the profile is approved today. Legacy alias slugs are mapped to the
--    canonical slug; a slug outside the catalogue (e.g. 'trainer-personal') gets no row, so that pro
--    is asked to pick a profession in the profile panel. ProProfile itself is not rewritten.
INSERT INTO "ProCategory" ("id", "profileId", "categorySlug", "priceFromCents", "position", "approvedAt", "createdAt", "updatedAt")
SELECT 'pc_' || replace(gen_random_uuid()::text, '-', ''), p."id", m.slug, p."priceFrom", 0,
       CASE WHEN p."verification" = 'APPROVED' THEN COALESCE(p."verifiedAt", CURRENT_TIMESTAMP) END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "ProProfile" p
CROSS JOIN LATERAL (SELECT CASE p."categorySlug"
      WHEN 'nane' THEN 'dado'
      WHEN 'makeup' THEN 'grim'
      WHEN 'parukeri' THEN 'frizer'
      WHEN 'berber' THEN 'frizer'
      WHEN 'tutor' THEN 'kurse'
      WHEN 'balet' THEN 'valle'
      WHEN 'vallezim' THEN 'valle'
      WHEN 'vallzim' THEN 'valle'
      WHEN 'postier' THEN 'korrier'
      WHEN 'hidraulik' THEN 'mjeshter-i-ujit'
      WHEN 'klima' THEN 'ngrohje-klimatizim'
      WHEN 'klimatizim' THEN 'ngrohje-klimatizim'
      WHEN 'riparime' THEN 'shtepiak'
      WHEN 'piktor' THEN 'moler'
      WHEN 'kopsht' THEN 'kopshtar'
      ELSE p."categorySlug" END AS slug) m
WHERE m.slug IN ('pastrim', 'dado', 'perkthyes', 'grim', 'frizer', 'kurse', 'valle', 'korrier', 'elektricist', 'mjeshter-i-ujit', 'ngrohje-klimatizim', 'shtepiak', 'moler', 'kopshtar')
ON CONFLICT ("profileId", "categorySlug") DO NOTHING;

-- 5) Minimum hours per profession, changeable any time in the profile panel. Null = none set:
--    Book now keeps using the pro's existing ProProfile."bookingMinMinutes", so no backfill is
--    needed and today's booking terms are unchanged. Same range as bookingMinMinutes, 30-minute steps.
ALTER TABLE "ProCategory" ADD COLUMN IF NOT EXISTS "minMinutes" INTEGER;
DO $m$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProCategory_minMinutes_check') THEN
    ALTER TABLE "ProCategory" ADD CONSTRAINT "ProCategory_minMinutes_check"
      CHECK ("minMinutes" IS NULL OR ("minMinutes" BETWEEN 30 AND 720 AND "minMinutes" % 30 = 0));
  END IF;
END
$m$;
