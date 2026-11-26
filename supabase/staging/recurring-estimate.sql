-- Recurring schedules + paid €15 estimate (step 3 + step 4) — additive, staging-first upgrade.
-- Adds RecurringSeries, Booking.seriesId/occurrenceAt and the estimate request/mark-paid columns.
-- Additive only: no existing row is rewritten. The Estimate state check is widened with CANCELLED.
-- Production (pfckeaicvexyaybptgfn) uses supabase/production/20261127_recurring_estimate.sql; this guard refuses it.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment' AND value->>'kind' = 'staging') THEN
    RAISE EXCEPTION 'This migration requires the dedicated staging marker';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BookingArrival') THEN
    RAISE EXCEPTION 'Apply arrita-checkin.sql first';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "occurrenceAt" TIMESTAMP(3),
ADD COLUMN     "seriesId" TEXT;

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "creationKey" TEXT,
ADD COLUMN     "paidById" TEXT,
ADD COLUMN     "paidNote" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "visitAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "detail" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "firstStartsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "proposedBy" TEXT NOT NULL,
    "sourceRequestId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pausedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "statusNote" TEXT,
    "generatedUntil" TIMESTAMP(3),
    "creationKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringSeries_creationKey_key" ON "RecurringSeries"("creationKey");
CREATE INDEX "RecurringSeries_status_generatedUntil_idx" ON "RecurringSeries"("status", "generatedUntil");
CREATE INDEX "RecurringSeries_clientId_createdAt_idx" ON "RecurringSeries"("clientId", "createdAt");
CREATE INDEX "RecurringSeries_profileId_createdAt_idx" ON "RecurringSeries"("profileId", "createdAt");
CREATE INDEX "Booking_seriesId_occurrenceAt_idx" ON "Booking"("seriesId", "occurrenceAt");
CREATE UNIQUE INDEX "Estimate_creationKey_key" ON "Estimate"("creationKey");
CREATE INDEX "Estimate_requestId_idx" ON "Estimate"("requestId");
CREATE INDEX "Estimate_state_createdAt_idx" ON "Estimate"("state", "createdAt");
-- One live booking per series occurrence (a cancelled occurrence can be regenerated after resume).
CREATE UNIQUE INDEX "Booking_series_occurrence_live_key" ON "Booking"("seriesId", "occurrenceAt") WHERE "seriesId" IS NOT NULL AND status = 'CONFIRMED';

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom server sessions: browser Data API roles have no access to application tables.
ALTER TABLE public."RecurringSeries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."RecurringSeries" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."RecurringSeries" TO service_role;

-- Invariants also hold outside the application code.
ALTER TABLE public."RecurringSeries" ADD CONSTRAINT "RecurringSeries_valid" CHECK (cadence IN ('WEEKLY','BIWEEKLY') AND weekday BETWEEN 0 AND 6 AND "startMinute" BETWEEN 0 AND 1439 AND minutes BETWEEN 30 AND 720 AND "hourlyRateCents" BETWEEN 100 AND 100000 AND status IN ('PROPOSED','ACTIVE','PAUSED','CANCELLED','DECLINED') AND "proposedBy" IN ('CLIENT','PRO') AND ("pausedBy" IS NULL OR "pausedBy" IN ('CLIENT','PRO','SYSTEM')) AND ("cancelledBy" IS NULL OR "cancelledBy" IN ('CLIENT','PRO')));
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_series_valid" CHECK (("seriesId" IS NULL) = ("occurrenceAt" IS NULL));
-- Widen the estimate states with CANCELLED (an unpaid request withdrawn); existing rows all still satisfy it.
ALTER TABLE public."Estimate" DROP CONSTRAINT "Estimate_state_valid";
ALTER TABLE public."Estimate" ADD CONSTRAINT "Estimate_state_valid" CHECK (state IN ('PENDING','PAID','CREDITED','REFUNDED','CANCELLED') AND "amountCents" >= 0 AND ("cancelledBy" IS NULL OR "cancelledBy" IN ('CLIENT','ADMIN')));
