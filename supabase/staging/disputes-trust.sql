-- Disputes (both statements, admin decision, to-dos) and pro trust history.
-- Additive, staging-first (owner request 26 Nov 2026). Existing rows keep NULL/default values.
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
ALTER TABLE "ServiceRequest" ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "customerCreditCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "finalPriceCents" INTEGER,
ADD COLUMN     "openedByRole" TEXT,
ADD COLUMN     "priorState" TEXT,
ADD COLUMN     "refundCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "respondBy" TIMESTAMP(3),
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "respondedById" TEXT,
ADD COLUMN     "response" TEXT,
ADD COLUMN     "todoCents" INTEGER,
ADD COLUMN     "todoDoneAt" TIMESTAMP(3),
ADD COLUMN     "todoDoneById" TEXT,
ADD COLUMN     "todoKind" TEXT;


ALTER TABLE public."ServiceRequest" ADD CONSTRAINT "ServiceRequest_cancelledBy_valid" CHECK ("cancelledBy" IS NULL OR "cancelledBy" IN ('CLIENT','PRO','PRO_NO_SHOW','NOBODY_HOME','DISPUTE_REFUND'));
ALTER TABLE public."Dispute" ADD CONSTRAINT "Dispute_decision_valid" CHECK (("openedByRole" IS NULL OR "openedByRole" IN ('CLIENT','PRO')) AND (outcome IS NULL OR outcome IN ('REFUND','FULL_REFUND','PARTIAL_REFUND','CREDIT','NO_ACTION')) AND ("finalPriceCents" IS NULL OR "finalPriceCents" > 0) AND "refundCents" >= 0 AND "customerCreditCents" >= 0 AND ("todoKind" IS NULL OR "todoKind" IN ('REFUND','CREDIT')) AND ("todoCents" IS NULL OR "todoCents" >= 0));
-- Trust history and the review alert read hired jobs by pro and cancellation time.
CREATE INDEX "ServiceRequest_acceptedProfileId_state_idx" ON public."ServiceRequest" ("acceptedProfileId", state);
CREATE INDEX "Dispute_todo_idx" ON public."Dispute" ("todoKind", "todoDoneAt");
