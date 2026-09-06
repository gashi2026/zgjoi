-- Zgjoi staging bootstrap: intended project jxddfakvakropstpfrvx only.
-- Generated from Prisma 5.22.0 migrate diff --from-empty --to-schema-datamodel.
-- Prisma schema SHA-256: 937b1764a75a8cf7e58ed0a5825c9f6520118814882f692887c3ec28e51002c5
-- Refuses any existing public application table or enum. Never run on production.
-- One DO statement creates all objects and restricts access atomically.
-- This is a standalone staging bootstrap, not a production migration baseline.
DO $zgjoi_staging_bootstrap$
DECLARE
  expected_tables constant text[] := ARRAY['AuditLog', 'Availability', 'Category', 'Conversation', 'Coupon', 'Dispute', 'LeadCharge', 'Message', 'Payment', 'Payout', 'ProDocument', 'ProProfile', 'ProService', 'Question', 'Quote', 'Review', 'ServiceRequest', 'Session', 'Setting', 'SupportMessage', 'SupportTicket', 'User'];
  actual_tables text[];
  table_name text;
  role_name text;
  privilege_name text;
  table_oid oid;
  public_oid oid;
BEGIN
  PERFORM pg_catalog.set_config('lock_timeout', '5s', true);
  PERFORM pg_catalog.set_config('statement_timeout', '60s', true);
  PERFORM pg_catalog.set_config('search_path', 'public,pg_catalog', true);
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Expected postgres bootstrap role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p'))
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e') THEN
    RAISE EXCEPTION 'Staging bootstrap requires an empty public application schema';
  END IF;
  REVOKE USAGE ON SCHEMA public FROM PUBLIC, anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PRO', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestState" AS ENUM ('OPEN', 'QUOTED', 'BOOKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "QuoteState" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EscrowStrategy" AS ENUM ('AUTH_HOLD', 'DESTINATION_CHARGE');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('PENDING', 'AUTHORISED', 'HELD', 'RELEASED', 'REFUNDED', 'DISPUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayoutState" AS ENUM ('SCHEDULED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('PUBLISHED', 'FLAGGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SupportState" AS ENUM ('OPEN', 'WAITING', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "personalNoEnc" TEXT,
    "personalNoLast4" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "city" TEXT,
    "emailVerified" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "priceFrom" INTEGER NOT NULL,
    "experience" TEXT,
    "serviceCities" TEXT[],
    "radiusKm" INTEGER NOT NULL DEFAULT 25,
    "verification" "VerificationState" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "ibanEnc" TEXT,
    "ibanLast4" TEXT,
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "stripePayoutsManual" BOOLEAN NOT NULL DEFAULT false,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" INTEGER NOT NULL DEFAULT 0,
    "weeklyBudget" INTEGER NOT NULL DEFAULT 4000,
    "weeklySpent" INTEGER NOT NULL DEFAULT 0,
    "autoBid" BOOLEAN NOT NULL DEFAULT true,
    "budgetResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProService" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "ProService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "accessNote" TEXT,
    "timing" TEXT NOT NULL,
    "budgetBand" TEXT,
    "detail" TEXT,
    "state" "RequestState" NOT NULL DEFAULT 'OPEN',
    "acceptedProfileId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "message" TEXT NOT NULL,
    "availableAt" TEXT,
    "duration" TEXT,
    "warranty" TEXT,
    "expectedDays" INTEGER NOT NULL DEFAULT 1,
    "state" "QuoteState" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "proAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "strategy" "EscrowStrategy" NOT NULL,
    "state" "PaymentState" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "authorisedAt" TIMESTAMP(3),
    "authExpiresAt" TIMESTAMP(3),
    "heldAt" TIMESTAMP(3),
    "releaseDeadline" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "expiryWarnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "state" "PayoutState" NOT NULL DEFAULT 'SCHEDULED',
    "reference" TEXT,
    "stripePayoutId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCharge" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tags" TEXT[],
    "state" "ReviewState" NOT NULL DEFAULT 'PUBLISHED',
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL DEFAULT 10,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "subject" TEXT,
    "state" "SupportState" NOT NULL DEFAULT 'OPEN',
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "fromAgent" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_userId_key" ON "ProProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_slug_key" ON "ProProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_stripeAccountId_key" ON "ProProfile"("stripeAccountId");

-- CreateIndex
CREATE INDEX "ProProfile_categorySlug_idx" ON "ProProfile"("categorySlug");

-- CreateIndex
CREATE INDEX "ProProfile_verification_idx" ON "ProProfile"("verification");

-- CreateIndex
CREATE INDEX "ProService_profileId_idx" ON "ProService"("profileId");

-- CreateIndex
CREATE INDEX "ProDocument_profileId_idx" ON "ProDocument"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_profileId_weekday_key" ON "Availability"("profileId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Question_categoryId_key_key" ON "Question"("categoryId", "key");

-- CreateIndex
CREATE INDEX "ServiceRequest_clientId_idx" ON "ServiceRequest"("clientId");

-- CreateIndex
CREATE INDEX "ServiceRequest_categorySlug_city_state_idx" ON "ServiceRequest"("categorySlug", "city", "state");

-- CreateIndex
CREATE INDEX "ServiceRequest_state_idx" ON "ServiceRequest"("state");

-- CreateIndex
CREATE INDEX "Quote_profileId_idx" ON "Quote"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_requestId_profileId_key" ON "Quote"("requestId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_requestId_key" ON "Payment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_state_idx" ON "Payment"("state");

-- CreateIndex
CREATE INDEX "Payment_state_authExpiresAt_idx" ON "Payment"("state", "authExpiresAt");

-- CreateIndex
CREATE INDEX "Payment_state_releaseDeadline_idx" ON "Payment"("state", "releaseDeadline");

-- CreateIndex
CREATE INDEX "Payout_profileId_state_idx" ON "Payout"("profileId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCharge_profileId_requestId_key" ON "LeadCharge"("profileId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_paymentId_key" ON "Dispute"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_requestId_key" ON "Review"("requestId");

-- CreateIndex
CREATE INDEX "Review_profileId_state_idx" ON "Review"("profileId", "state");

-- CreateIndex
CREATE INDEX "Review_state_idx" ON "Review"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_userId_idx" ON "Coupon"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_requestId_key" ON "Conversation"("requestId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_state_createdAt_idx" ON "SupportTicket"("state", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProService" ADD CONSTRAINT "ProService_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProDocument" ADD CONSTRAINT "ProDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_acceptedProfileId_fkey" FOREIGN KEY ("acceptedProfileId") REFERENCES "ProProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCharge" ADD CONSTRAINT "LeadCharge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCharge" ADD CONSTRAINT "LeadCharge_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

  PERFORM pg_catalog.set_config('lock_timeout', '5s', true);
  PERFORM pg_catalog.set_config('statement_timeout', '30s', true);

  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Expected the verified postgres migration role';
  END IF;
  SELECT oid INTO public_oid FROM pg_catalog.pg_namespace WHERE nspname = 'public';
  SELECT array_agg(c.relname::text ORDER BY c.relname::text)
    INTO actual_tables
    FROM pg_catalog.pg_class c
    WHERE c.relnamespace = public_oid AND c.relkind IN ('r', 'p');
  IF actual_tables IS DISTINCT FROM expected_tables THEN
    RAISE EXCEPTION 'Public table inventory changed; inspect before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.relnamespace = public_oid AND c.relkind IN ('r','p')
      AND pg_catalog.pg_get_userbyid(c.relowner) <> 'postgres'
  ) THEN
    RAISE EXCEPTION 'Table ownership changed; inspect before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    WHERE c.relnamespace = public_oid AND a.attnum > 0
      AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Column privileges changed; inspect before retrying';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Unexpected privileged API role';
  END IF;

  -- PUBLIC is the PostgreSQL pseudo-role covering every role. Remove both
  -- inherited public usage and the two API roles' explicit usage.
  -- Existing postgres, pg_database_owner and service_role access is retained.
  REVOKE USAGE ON SCHEMA public FROM PUBLIC, anon, authenticated;

  FOREACH table_name IN ARRAY expected_tables LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      table_name
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;

  -- Future Prisma migrations executed as postgres must opt in to API access.
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
  -- Implicit global PUBLIC function privileges are not modified. Schema USAGE
  -- denial remains the boundary; any future API/RPC exposure requires review.
  -- Supabase-managed roles' defaults in other schemas are unchanged.

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF pg_catalog.has_schema_privilege(role_name, public_oid, 'USAGE') THEN
      RAISE EXCEPTION 'API role % still has public schema usage', role_name;
    END IF;
    FOREACH table_name IN ARRAY expected_tables LOOP
      table_oid := pg_catalog.to_regclass(format('public.%I', table_name));
      IF pg_catalog.has_any_column_privilege(role_name, table_oid, 'SELECT, INSERT, UPDATE')
         OR pg_catalog.has_table_privilege(role_name, table_oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') THEN
        RAISE EXCEPTION 'API role % retains a privilege on %', role_name, table_name;
      END IF;
      IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c WHERE c.oid = table_oid) THEN
        RAISE EXCEPTION 'RLS is not enabled on %', table_name;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH role_name IN ARRAY ARRAY['postgres','service_role'] LOOP
    IF NOT pg_catalog.has_schema_privilege(role_name, public_oid, 'USAGE') THEN
      RAISE EXCEPTION 'Trusted role % lost schema usage', role_name;
    END IF;
    FOREACH table_name IN ARRAY expected_tables LOOP
      table_oid := pg_catalog.to_regclass(format('public.%I', table_name));
      FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
        IF NOT pg_catalog.has_table_privilege(role_name, table_oid, privilege_name) THEN
          RAISE EXCEPTION 'Trusted role % lost % on %', role_name, privilege_name, table_name;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  INSERT INTO public."Setting" (key, value) VALUES (
    '_staging_environment',
    jsonb_build_object('kind','staging','projectRef','jxddfakvakropstpfrvx','schemaSha256','937b1764a75a8cf7e58ed0a5825c9f6520118814882f692887c3ec28e51002c5','fixtureVersion',0)
  );
END
$zgjoi_staging_bootstrap$;
