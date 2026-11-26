-- Recurring monthly cadence + estimate 10 €/5 € split — additive, staging-first upgrade on top of recurring-estimate.sql.
-- Production (pfckeaicvexyaybptgfn) gets the same statements at the end of supabase/production/20261127_recurring_estimate.sql; this guard refuses it.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment' AND value->>'kind' = 'staging') THEN
    RAISE EXCEPTION 'This migration requires the dedicated staging marker';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecurringSeries') THEN
    RAISE EXCEPTION 'Apply recurring-estimate.sql first';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;
-- Owner answers (26 Nov 2026): monthly cadence ("Çdo muaj") and the 10 € / 5 € split of an estimate that is not credited to a hire.
ALTER TABLE public."RecurringSeries" ADD COLUMN "monthDay" INTEGER;
ALTER TABLE public."Estimate" ADD COLUMN "proShareCents" INTEGER, ADD COLUMN "platformShareCents" INTEGER;
-- Widen the series check with MONTHLY (existing WEEKLY/BIWEEKLY rows have monthDay NULL and still satisfy it).
ALTER TABLE public."RecurringSeries" DROP CONSTRAINT "RecurringSeries_valid";
ALTER TABLE public."RecurringSeries" ADD CONSTRAINT "RecurringSeries_valid" CHECK (cadence IN ('WEEKLY','BIWEEKLY','MONTHLY') AND weekday BETWEEN 0 AND 6 AND "startMinute" BETWEEN 0 AND 1439 AND minutes BETWEEN 30 AND 720 AND "hourlyRateCents" BETWEEN 100 AND 100000 AND status IN ('PROPOSED','ACTIVE','PAUSED','CANCELLED','DECLINED') AND "proposedBy" IN ('CLIENT','PRO') AND ("pausedBy" IS NULL OR "pausedBy" IN ('CLIENT','PRO','SYSTEM')) AND ("cancelledBy" IS NULL OR "cancelledBy" IN ('CLIENT','PRO')) AND ((cadence = 'MONTHLY') = ("monthDay" IS NOT NULL)) AND ("monthDay" IS NULL OR "monthDay" BETWEEN 1 AND 31));
ALTER TABLE public."Estimate" ADD CONSTRAINT "Estimate_split_valid" CHECK ((("proShareCents" IS NULL) = ("platformShareCents" IS NULL)) AND ("proShareCents" IS NULL OR ("proShareCents" >= 0 AND "platformShareCents" >= 0 AND "proShareCents" + "platformShareCents" = "amountCents")));
