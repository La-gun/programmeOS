-- Integrity enums
CREATE TYPE "IntegrityRuleCode" AS ENUM ('DUPLICATE_PHONE', 'SUBMISSION_VELOCITY');

CREATE TYPE "IntegrityCaseStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- Extend audit trail for integrity workflow
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRITY_FLAG_RAISED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRITY_CASE_OPENED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRITY_CASE_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRITY_CASE_DISMISSED';

-- Tables
CREATE TABLE "integrity_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "IntegrityCaseStatus" NOT NULL DEFAULT 'OPEN',
    "triggerEvidenceSubmissionId" TEXT,
    "primaryParticipantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "integrity_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integrity_flags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "ruleCode" "IntegrityRuleCode" NOT NULL,
    "summary" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "metadata" JSONB,
    "evidenceSubmissionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrity_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integrity_cases_triggerEvidenceSubmissionId_key" ON "integrity_cases"("triggerEvidenceSubmissionId");

CREATE INDEX "integrity_cases_tenantId_status_idx" ON "integrity_cases"("tenantId", "status");

CREATE INDEX "integrity_flags_tenantId_ruleCode_idx" ON "integrity_flags"("tenantId", "ruleCode");

CREATE INDEX "integrity_flags_caseId_idx" ON "integrity_flags"("caseId");

CREATE INDEX "integrity_flags_evidenceSubmissionId_idx" ON "integrity_flags"("evidenceSubmissionId");

ALTER TABLE "integrity_cases" ADD CONSTRAINT "integrity_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integrity_cases" ADD CONSTRAINT "integrity_cases_triggerEvidenceSubmissionId_fkey" FOREIGN KEY ("triggerEvidenceSubmissionId") REFERENCES "evidence_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integrity_cases" ADD CONSTRAINT "integrity_cases_primaryParticipantId_fkey" FOREIGN KEY ("primaryParticipantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integrity_cases" ADD CONSTRAINT "integrity_cases_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integrity_flags" ADD CONSTRAINT "integrity_flags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integrity_flags" ADD CONSTRAINT "integrity_flags_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "integrity_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integrity_flags" ADD CONSTRAINT "integrity_flags_evidenceSubmissionId_fkey" FOREIGN KEY ("evidenceSubmissionId") REFERENCES "evidence_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integrity_flags" ADD CONSTRAINT "integrity_flags_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
