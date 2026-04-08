-- CreateEnum
CREATE TYPE "AiSuggestionKind" AS ENUM ('EVIDENCE_SUMMARY', 'REVIEWER_SUMMARY_DRAFT', 'COHORT_SUMMARY', 'PARTICIPANT_REPLY_DRAFT');

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "kind" "AiSuggestionKind" NOT NULL,
    "outputText" TEXT NOT NULL,
    "outputStructured" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "confidenceLabel" TEXT,
    "confidenceRationale" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "evidenceSubmissionId" TEXT,
    "evidenceReviewId" TEXT,
    "cohortId" TEXT,
    "participantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_suggestions_tenantId_evidenceSubmissionId_idx" ON "ai_suggestions"("tenantId", "evidenceSubmissionId");

-- CreateIndex
CREATE INDEX "ai_suggestions_tenantId_evidenceReviewId_idx" ON "ai_suggestions"("tenantId", "evidenceReviewId");

-- CreateIndex
CREATE INDEX "ai_suggestions_tenantId_cohortId_idx" ON "ai_suggestions"("tenantId", "cohortId");

-- CreateIndex
CREATE INDEX "ai_suggestions_tenantId_participantId_idx" ON "ai_suggestions"("tenantId", "participantId");

-- CreateIndex
CREATE INDEX "ai_suggestions_tenantId_createdAt_idx" ON "ai_suggestions"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_evidenceSubmissionId_fkey" FOREIGN KEY ("evidenceSubmissionId") REFERENCES "evidence_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_evidenceReviewId_fkey" FOREIGN KEY ("evidenceReviewId") REFERENCES "evidence_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
