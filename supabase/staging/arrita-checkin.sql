-- Arrita proof of presence — additive, staging-first upgrade (owner-approved 26 Nov 2026).
-- Adds the booking address coordinates, the BookingArrival check-in table and a
-- geocoding cache. Additive only: no existing row is rewritten.
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
ALTER TABLE "Booking" ADD COLUMN     "siteGeocode" TEXT,
ADD COLUMN     "siteGeocodedAt" TIMESTAMP(3),
ADD COLUMN     "siteLat" DOUBLE PRECISION,
ADD COLUMN     "siteLng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "BookingArrival" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracyM" INTEGER,
    "distanceM" INTEGER,
    "method" TEXT NOT NULL,
    "photo" BYTEA,
    "photoMime" TEXT,
    "photoSize" INTEGER,
    "helplineAt" TIMESTAMP(3),
    "waitEndsAt" TIMESTAMP(3),
    "contactResult" TEXT,
    "contactNote" TEXT,
    "contactById" TEXT,
    "contactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingArrival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingArrival_bookingId_key" ON "BookingArrival"("bookingId");

-- CreateIndex
CREATE INDEX "BookingArrival_helplineAt_idx" ON "BookingArrival"("helplineAt");

-- AddForeignKey
ALTER TABLE "BookingArrival" ADD CONSTRAINT "BookingArrival_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom server sessions: browser Data API roles have no access to application tables.
ALTER TABLE public."BookingArrival" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."BookingArrival" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."BookingArrival" TO service_role;
ALTER TABLE public."GeocodeCache" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."GeocodeCache" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."GeocodeCache" TO service_role;

-- Invariants also hold outside the application code.
ALTER TABLE public."Booking" ADD CONSTRAINT "Booking_site_valid" CHECK (("siteGeocode" IS NULL OR "siteGeocode" IN ('OK','NOT_FOUND','UNAVAILABLE')) AND ("siteLat" IS NULL OR "siteLat" BETWEEN -90 AND 90) AND ("siteLng" IS NULL OR "siteLng" BETWEEN -180 AND 180));
ALTER TABLE public."BookingArrival" ADD CONSTRAINT "BookingArrival_valid" CHECK (method IN ('GPS','PHOTO') AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180 AND ("distanceM" IS NULL OR "distanceM" >= 0) AND ("accuracyM" IS NULL OR "accuracyM" >= 0) AND ("photoSize" IS NULL OR "photoSize" BETWEEN 1 AND 600000) AND (method <> 'PHOTO' OR photo IS NOT NULL) AND ("contactResult" IS NULL OR "contactResult" IN ('REACHED_GOES_AHEAD','REACHED_CANCELLED','NO_ANSWER')) AND ("waitEndsAt" IS NULL OR "helplineAt" IS NOT NULL));
ALTER TABLE public."GeocodeCache" ADD CONSTRAINT "GeocodeCache_valid" CHECK (status IN ('OK','NOT_FOUND') AND (status <> 'OK' OR (lat IS NOT NULL AND lng IS NOT NULL)));
