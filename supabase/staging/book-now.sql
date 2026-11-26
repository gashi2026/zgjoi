-- Book now (hourly) — additive, staging-first upgrade (owner-approved 26 Nov 2026).
-- Adds per-category hiring-path overrides, the pro's hourly rate and minimum,
-- the Booking / BookingChange / Estimate tables and the phase-2 payment seam.
-- Additive only: no existing row is rewritten, so it is safe on a populated staging DB.
-- Production (pfckeaicvexyaybptgfn) needs its own reviewed rollout; this guard refuses it.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment' AND value->>'kind' = 'staging') THEN
    RAISE EXCEPTION 'This migration requires the dedicated staging marker';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;
-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN     "bookingMinMinutes" INTEGER,
ADD COLUMN     "hourlyRateCents" INTEGER;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "bookNowEnabled" BOOLEAN,
ADD COLUMN     "estimateEnabled" BOOLEAN,
ADD COLUMN     "estimatePriceCents" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "estimateCreditCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'OFFLINE';

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "minMinutes" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "proCents" INTEGER NOT NULL,
    "creditCents" INTEGER NOT NULL DEFAULT 0,
    "dueCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "feeProCents" INTEGER NOT NULL DEFAULT 0,
    "feePlatformCents" INTEGER NOT NULL DEFAULT 0,
    "refundCents" INTEGER NOT NULL DEFAULT 0,
    "creationKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingChange" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "actorId" TEXT,
    "minutes" INTEGER,
    "totalCents" INTEGER,
    "note" TEXT,
    "todoKind" TEXT,
    "todoCents" INTEGER,
    "todoDoneAt" TIMESTAMP(3),
    "todoDoneById" TEXT,
    "meta" JSONB,
    "decidedAt" TIMESTAMP(3),
    "creationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "requestId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 1500,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "creditedRequestId" TEXT,
    "creditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_requestId_key" ON "Booking"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_creationKey_key" ON "Booking"("creationKey");

-- CreateIndex
CREATE INDEX "Booking_profileId_startsAt_idx" ON "Booking"("profileId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_clientId_createdAt_idx" ON "Booking"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingChange_creationKey_key" ON "BookingChange"("creationKey");

-- CreateIndex
CREATE INDEX "BookingChange_bookingId_createdAt_idx" ON "BookingChange"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingChange_todoKind_todoDoneAt_idx" ON "BookingChange"("todoKind", "todoDoneAt");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_creditedRequestId_key" ON "Estimate"("creditedRequestId");

-- CreateIndex
CREATE INDEX "Estimate_clientId_profileId_state_idx" ON "Estimate"("clientId", "profileId", "state");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChange" ADD CONSTRAINT "BookingChange_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Custom server sessions: browser Data API roles have no access to application tables.
ALTER TABLE public."Booking" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Booking" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Booking" TO service_role;
ALTER TABLE public."BookingChange" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."BookingChange" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."BookingChange" TO service_role;
ALTER TABLE public."Estimate" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Estimate" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Estimate" TO service_role;

-- Money and state invariants also hold outside the application code.
ALTER TABLE public."ProProfile" ADD CONSTRAINT "ProProfile_booking_terms_valid" CHECK (("hourlyRateCents" IS NULL OR "hourlyRateCents" BETWEEN 100 AND 100000) AND ("bookingMinMinutes" IS NULL OR "bookingMinMinutes" BETWEEN 30 AND 720));
ALTER TABLE public."Category" ADD CONSTRAINT "Category_estimate_price_valid" CHECK ("estimatePriceCents" IS NULL OR "estimatePriceCents" BETWEEN 0 AND 100000);
ALTER TABLE public."Payment" ADD CONSTRAINT "Payment_method_valid" CHECK (method IN ('OFFLINE','CARD') AND "estimateCreditCents" >= 0);
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_money_valid" CHECK ("hourlyRateCents" > 0 AND minutes > 0 AND minutes >= "minMinutes" AND "totalCents" > 0 AND "totalCents" <= 10000000 AND "commissionCents" >= 0 AND "proCents" >= 0 AND "commissionCents" + "proCents" = "totalCents" AND "creditCents" >= 0 AND "dueCents" >= 0 AND "feeCents" = "feeProCents" + "feePlatformCents" AND "refundCents" >= 0);
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_state_valid" CHECK (status IN ('CONFIRMED','CANCELLED') AND ("cancelledBy" IS NULL OR "cancelledBy" IN ('CLIENT','PRO','ADMIN')) AND ("cancelReason" IS NULL OR "cancelReason" IN ('CANCEL','NO_SHOW','NOBODY_HOME')));
ALTER TABLE public."BookingChange" ADD CONSTRAINT "BookingChange_state_valid" CHECK (kind IN ('HOURS','CANCELLATION') AND state IN ('PROPOSED','CONFIRMED','DECLINED','SUPERSEDED','RECORDED') AND ("todoKind" IS NULL OR "todoKind" IN ('REFUND','COLLECT')) AND ("todoCents" IS NULL OR "todoCents" >= 0) AND (minutes IS NULL OR minutes > 0) AND ("totalCents" IS NULL OR "totalCents" > 0));
ALTER TABLE public."Estimate" ADD CONSTRAINT "Estimate_state_valid" CHECK (state IN ('PENDING','PAID','CREDITED','REFUNDED') AND "amountCents" >= 0);
