-- Identity verification (front + back ID photo, owner approves/declines) — additive, staging-first upgrade.
-- Adds IdVerification and IdDocumentImage (photos AES-256-GCM encrypted with ENCRYPTION_KEY; RLS on, no browser-role access).
-- Additive only: no existing table or row is touched.
-- Production (pfckeaicvexyaybptgfn) uses supabase/production/20261128_id_verification.sql; this guard refuses it.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment' AND value->>'kind' = 'staging') THEN
    RAISE EXCEPTION 'This migration requires the dedicated staging marker';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'RecurringSeries' AND column_name = 'monthDay') THEN
    RAISE EXCEPTION 'Apply recurring-monthly-split.sql first';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;
-- CreateTable
CREATE TABLE "IdVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "declineReason" TEXT,
    "declineNote" TEXT,
    "purgeAfter" TIMESTAMP(3),
    "imagesDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdDocumentImage" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "dataEnc" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdDocumentImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdVerification_userId_key" ON "IdVerification"("userId");
CREATE INDEX "IdVerification_status_submittedAt_idx" ON "IdVerification"("status", "submittedAt");
CREATE INDEX "IdVerification_purgeAfter_idx" ON "IdVerification"("purgeAfter");
CREATE UNIQUE INDEX "IdDocumentImage_verificationId_side_key" ON "IdDocumentImage"("verificationId", "side");

-- AddForeignKey
ALTER TABLE "IdVerification" ADD CONSTRAINT "IdVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdDocumentImage" ADD CONSTRAINT "IdDocumentImage_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "IdVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom server sessions: browser Data API roles have no access to application tables (ID photos above all).
ALTER TABLE public."IdVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IdDocumentImage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."IdVerification" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."IdDocumentImage" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."IdVerification" TO service_role;
GRANT ALL ON TABLE public."IdDocumentImage" TO service_role;

-- Invariants also hold outside the application code.
ALTER TABLE public."IdVerification" ADD CONSTRAINT "IdVerification_valid" CHECK (status IN ('PENDING','APPROVED','DECLINED') AND attempts >= 1 AND ((status = 'PENDING') = ("decidedAt" IS NULL)) AND ((status = 'DECLINED') = ("declineReason" IS NOT NULL)) AND ("declineNote" IS NULL OR length("declineNote") <= 500));
ALTER TABLE public."IdDocumentImage" ADD CONSTRAINT "IdDocumentImage_valid" CHECK (side IN ('FRONT','BACK') AND "mimeType" IN ('image/jpeg','image/png') AND "sizeBytes" BETWEEN 1 AND 2097152 AND octet_length("dataEnc") <= 2097152 + 28);

-- Owner answers (26 Nov 2026): only ID card (letërnjoftim) or passport; the owner grants/revokes ID review per SUPPORT user.
ALTER TABLE public."IdVerification" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'ID_CARD';
ALTER TABLE public."IdVerification" ADD CONSTRAINT "IdVerification_documentType_valid" CHECK ("documentType" IN ('ID_CARD','PASSPORT'));
ALTER TABLE public."User" ADD COLUMN "canReviewIds" BOOLEAN NOT NULL DEFAULT false;

-- Owner answer (26 Nov 2026): photos go 30 days after any decision, but a permanent identity record is kept for legal and safety reporting.
-- Filled by the reviewer from the ID on approval. Date of birth and document number are AES-256-GCM encrypted by the application (ENCRYPTION_KEY).
-- Never removed by the photo cleanup; a user row with a record cannot be deleted (ON DELETE RESTRICT).
CREATE TABLE "IdentityRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "birthDateEnc" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNoEnc" TEXT NOT NULL,
    "documentNoLast4" TEXT NOT NULL,
    "issuingCountry" TEXT NOT NULL,
    "expiresOn" DATE NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IdentityRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdentityRecord_userId_key" ON "IdentityRecord"("userId");
CREATE INDEX "IdentityRecord_legalName_idx" ON "IdentityRecord"("legalName");
CREATE INDEX "IdentityRecord_documentNoLast4_idx" ON "IdentityRecord"("documentNoLast4");
ALTER TABLE "IdentityRecord" ADD CONSTRAINT "IdentityRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."IdentityRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."IdentityRecord" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."IdentityRecord" TO service_role;
ALTER TABLE public."IdentityRecord" ADD CONSTRAINT "IdentityRecord_valid" CHECK ("documentType" IN ('ID_CARD','PASSPORT') AND length("legalName") BETWEEN 2 AND 120 AND length("issuingCountry") BETWEEN 2 AND 60 AND "documentNoLast4" ~ '^[A-Z0-9]{1,4}$');
