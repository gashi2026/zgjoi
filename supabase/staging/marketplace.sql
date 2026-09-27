-- Staging-only upgrade from the reviewed foundation schema.
-- No production data is copied or rewritten. Provider records the actual migration version.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Setting" WHERE key = '_staging_environment' AND value->>'kind' = 'staging') THEN
    RAISE EXCEPTION 'This migration requires the dedicated staging marker';
  END IF;
  IF EXISTS (SELECT 1 FROM public."ServiceRequest") OR EXISTS (SELECT 1 FROM public."Payment") OR EXISTS (SELECT 1 FROM public."Payout") THEN
    RAISE EXCEPTION 'Existing marketplace records require a separately reviewed migration/backfill';
  END IF;
END
$guard$;
SET LOCAL search_path = public, pg_catalog;
-- AlterEnum
ALTER TYPE "QuoteState" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "EscrowStrategy" ADD VALUE 'PLATFORM_CHARGE';

-- AlterEnum
ALTER TYPE "PaymentState" ADD VALUE 'REFUND_PENDING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayoutState" ADD VALUE 'TRANSFERRED';
ALTER TYPE "PayoutState" ADD VALUE 'PROCESSING';

-- DropIndex
DROP INDEX "Quote_requestId_profileId_key";

-- AlterTable
ALTER TABLE "ProProfile" ALTER COLUMN "weeklyBudget" SET DEFAULT 0,
ALTER COLUMN "autoBid" SET DEFAULT false;

-- AlterTable
ALTER TABLE "ProDocument" ADD COLUMN     "filename" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storagePath" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "acceptedQuoteId" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "creationKey" TEXT,
ADD COLUMN     "selectedProfileId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "creationKey" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "connectedAccountId" TEXT,
ADD COLUMN     "operation" TEXT,
ADD COLUMN     "operationStartedAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'disabled',
ADD COLUMN     "providerCheckoutId" TEXT,
ADD COLUMN     "providerRefundId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "providerOperationKey" TEXT;

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "outcome" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "clientKey" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "guestTokenHash" TEXT;

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payloadEnc" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentId" TEXT,
    "kind" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_purpose_idx" ON "AuthToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Outbox_key_key" ON "Outbox"("key");

-- CreateIndex
CREATE INDEX "Outbox_state_availableAt_idx" ON "Outbox"("state", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_profileId_key" ON "Favorite"("userId", "profileId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_eventId_key" ON "PaymentEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProDocument_storagePath_key" ON "ProDocument"("storagePath");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_acceptedQuoteId_key" ON "ServiceRequest"("acceptedQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_creationKey_key" ON "ServiceRequest"("creationKey");

-- CreateIndex
CREATE INDEX "ServiceRequest_selectedProfileId_state_updatedAt_idx" ON "ServiceRequest"("selectedProfileId", "state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_creationKey_key" ON "Quote"("creationKey");

-- CreateIndex
CREATE INDEX "Quote_state_expiresAt_idx" ON "Quote"("state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_requestId_profileId_revision_key" ON "Quote"("requestId", "profileId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerCheckoutId_key" ON "Payment"("providerCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRefundId_key" ON "Payment"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_paymentId_key" ON "Payout"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_providerOperationKey_key" ON "Payout"("providerOperationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_senderId_clientKey_key" ON "Message"("conversationId", "senderId", "clientKey");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_updatedAt_idx" ON "SupportTicket"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_guestTokenHash_idx" ON "SupportTicket"("guestTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SupportMessage_dedupeKey_key" ON "SupportMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_selectedProfileId_fkey" FOREIGN KEY ("selectedProfileId") REFERENCES "ProProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_acceptedQuoteId_fkey" FOREIGN KEY ("acceptedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom server sessions: browser Data API roles have no access to application tables.
ALTER TABLE public."AuthToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AuthToken" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."AuthToken" TO service_role;
ALTER TABLE public."RateLimitBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."RateLimitBucket" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."RateLimitBucket" TO service_role;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Notification" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Notification" TO service_role;
ALTER TABLE public."Outbox" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Outbox" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Outbox" TO service_role;
ALTER TABLE public."Favorite" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Favorite" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."Favorite" TO service_role;
ALTER TABLE public."PaymentEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PaymentEvent" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."PaymentEvent" TO service_role;

-- Money, ratings, token and schedule invariants also hold outside the application code.
ALTER TABLE public."Payment" ADD CONSTRAINT "Payment_money_valid" CHECK (amount > 0 AND amount <= 10000000 AND "commissionAmount" >= 0 AND "proAmount" >= 0 AND "commissionAmount" + "proAmount" = amount AND currency = 'EUR');
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_money_valid" CHECK (amount > 0 AND amount <= 10000000 AND revision > 0);
ALTER TABLE public."Quote" ADD CONSTRAINT "Quote_dates_valid" CHECK ("expiresAt" IS NULL OR "scheduledAt" IS NULL OR "scheduledAt" > "expiresAt");
ALTER TABLE public."Review" ADD CONSTRAINT "Review_rating_valid" CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public."Availability" ADD CONSTRAINT "Availability_times_valid" CHECK (weekday BETWEEN 0 AND 6 AND "startMin" >= 0 AND "endMin" <= 1440 AND "endMin" > "startMin");
ALTER TABLE public."RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_hits_valid" CHECK (hits > 0);
ALTER TABLE public."AuthToken" ADD CONSTRAINT "AuthToken_hash_valid" CHECK ("tokenHash" ~ '^sha256:[a-f0-9]{64}$' AND purpose IN ('EMAIL_VERIFY','PASSWORD_RESET'));
ALTER TABLE public."ProDocument" ADD CONSTRAINT "ProDocument_size_valid" CHECK ("sizeBytes" IS NULL OR "sizeBytes" BETWEEN 1 AND 3145728);
ALTER TABLE public."Outbox" ADD CONSTRAINT "Outbox_state_valid" CHECK (state IN ('PENDING','PROCESSING','SENT','FAILED') AND attempts >= 0);
ALTER TABLE public."ServiceRequest" ADD CONSTRAINT "ServiceRequest_version_valid" CHECK (version >= 0);
ALTER TABLE public."Notification" ADD CONSTRAINT "Notification_internal_href" CHECK (href LIKE '/%' AND href NOT LIKE '//%');
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON public."Message" ("conversationId", "createdAt", id);
CREATE INDEX "SupportMessage_ticketId_createdAt_id_idx" ON public."SupportMessage" ("ticketId", "createdAt", id);
CREATE INDEX "ProProfile_catalog_idx" ON public."ProProfile" (verification, "categorySlug", "ratingAvg", id);

-- Flag old session format for re-login on release; do not copy raw tokens anywhere.
-- Existing sessions are empty in staging; production rollout needs an explicit session cutover.
