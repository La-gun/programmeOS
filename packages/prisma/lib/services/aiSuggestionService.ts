import type { AiSuggestionKind, Prisma } from '@prisma/client'
import { z } from 'zod'
import { getAiTextProvider } from '../ai/provider'
import { prisma } from '../client'
import { getCohortById } from './cohortService'
import {
  getEvidenceReviewInTenant,
  getEvidenceSubmissionById,
  listDocumentsByIds
} from './evidenceService'
import { getParticipantById } from './participantService'
import { idSchema } from './schemas'

const suggestReplyBodySchema = z
  .object({
    inboundContext: z.string().max(8000).optional(),
    intent: z.enum(['check_in', 'nudge', 'clarify', 'celebrate', 'neutral']).optional()
  })
  .strict()

export type AiSuggestionResult = {
  isAiSuggestion: true
  kind: AiSuggestionKind
  text: string
  structured: Record<string, unknown> | null
  confidence: {
    score: number | null
    label: string | null
    rationale: string | null
  }
  provider: string
  model: string | null
  persistedId: string
}

async function persistSuggestion(data: {
  tenantId: string
  createdByUserId: string
  kind: AiSuggestionKind
  outputText: string
  outputStructured?: Prisma.InputJsonValue
  confidenceScore?: number
  confidenceLabel?: string
  confidenceRationale?: string
  provider: string
  model?: string | null
  evidenceSubmissionId?: string
  evidenceReviewId?: string
  cohortId?: string
  participantId?: string
}) {
  return prisma.aiSuggestion.create({
    data: {
      tenantId: data.tenantId,
      createdByUserId: data.createdByUserId,
      kind: data.kind,
      outputText: data.outputText,
      outputStructured: data.outputStructured ?? undefined,
      confidenceScore: data.confidenceScore,
      confidenceLabel: data.confidenceLabel,
      confidenceRationale: data.confidenceRationale,
      provider: data.provider,
      model: data.model ?? undefined,
      evidenceSubmissionId: data.evidenceSubmissionId,
      evidenceReviewId: data.evidenceReviewId,
      cohortId: data.cohortId,
      participantId: data.participantId
    }
  })
}

function resolvedModelId(providerId: string) {
  if (providerId === 'openai') {
    return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  }
  return null
}

function toPublicResult(
  row: { id: string; kind: AiSuggestionKind },
  completion: { text: string; structured?: Record<string, unknown>; confidence?: { score: number; label: string; rationale?: string } },
  meta: { provider: string; model: string | null }
): AiSuggestionResult {
  return {
    isAiSuggestion: true,
    kind: row.kind,
    text: completion.text,
    structured: completion.structured ?? null,
    confidence: {
      score: completion.confidence?.score ?? null,
      label: completion.confidence?.label ?? null,
      rationale: completion.confidence?.rationale ?? null
    },
    provider: meta.provider,
    model: meta.model,
    persistedId: row.id
  }
}

export async function summarizeEvidence(
  submissionId: string,
  context: { tenantId: string; actingUserId: string }
): Promise<AiSuggestionResult> {
  const id = idSchema.parse(submissionId)
  const submission = await getEvidenceSubmissionById(id, context.tenantId)
  if (!submission) {
    throw new Error('Evidence submission not found.')
  }

  const docs = await listDocumentsByIds(submission.documents, context.tenantId)
  const provider = getAiTextProvider()
  const system = [
    'You help programme staff by drafting a short evidence summary suggestion.',
    'You only see titles and metadata — not file contents.',
    'Output must read as a suggestion. Never instruct automatic approval or rejection.',
    'Do not invent facts beyond the provided fields.'
  ].join(' ')

  const user = [
    `Title: ${submission.title}`,
    `Description: ${submission.description ?? '(none)'}`,
    `Milestone: ${submission.participantMilestone.milestoneTemplate.name}`,
    `Status: ${submission.status}`,
    `Attached files (names only): ${docs.map((d) => d.name).join('; ') || '(none)'}`
  ].join('\n')

  const completion = await provider.complete({ system, user })
  const model = resolvedModelId(provider.id)
  const row = await persistSuggestion({
    tenantId: context.tenantId,
    createdByUserId: context.actingUserId,
    kind: 'EVIDENCE_SUMMARY',
    outputText: completion.text,
    outputStructured: completion.structured as Prisma.InputJsonValue | undefined,
    confidenceScore: completion.confidence?.score,
    confidenceLabel: completion.confidence?.label,
    confidenceRationale: completion.confidence?.rationale,
    provider: provider.id,
    model,
    evidenceSubmissionId: id
  })

  return toPublicResult(row, completion, { provider: provider.id, model })
}

export async function draftReviewerSummary(
  reviewId: string,
  context: { tenantId: string; actingUserId: string }
): Promise<AiSuggestionResult> {
  const id = idSchema.parse(reviewId)
  const review = await getEvidenceReviewInTenant(id, context.tenantId)
  if (!review) {
    throw new Error('Review not found.')
  }

  const sub = review.evidenceSubmission
  const docs = await listDocumentsByIds(sub.documents, context.tenantId)
  const provider = getAiTextProvider()
  const system = [
    'You draft optional reviewer-facing summary notes as a suggestion.',
    'You only see metadata — not binary evidence files.',
    'The human reviewer decides approve, reject, or request changes. Never tell them what to decide.',
    'Keep tone professional and concise.'
  ].join(' ')

  const other = sub.reviews
    .filter((r) => r.id !== review.id)
    .map((r) => `${r.reviewer.email}: ${r.status}`)
    .join('; ')

  const user = [
    `Submission: ${sub.title}`,
    `Description: ${sub.description ?? '(none)'}`,
    `Milestone: ${sub.participantMilestone.milestoneTemplate.name}`,
    `Assignee (you): ${review.reviewer.email}`,
    `Other assignments: ${other || '(none)'}`,
    `Files (names only): ${docs.map((d) => d.name).join('; ') || '(none)'}`
  ].join('\n')

  const completion = await provider.complete({ system, user })
  const model = resolvedModelId(provider.id)
  const row = await persistSuggestion({
    tenantId: context.tenantId,
    createdByUserId: context.actingUserId,
    kind: 'REVIEWER_SUMMARY_DRAFT',
    outputText: completion.text,
    outputStructured: completion.structured as Prisma.InputJsonValue | undefined,
    confidenceScore: completion.confidence?.score,
    confidenceLabel: completion.confidence?.label,
    confidenceRationale: completion.confidence?.rationale,
    provider: provider.id,
    model,
    evidenceSubmissionId: sub.id,
    evidenceReviewId: id
  })

  return toPublicResult(row, completion, { provider: provider.id, model })
}

export async function generateCohortSummary(
  cohortId: string,
  context: { tenantId: string; actingUserId: string }
): Promise<AiSuggestionResult> {
  const id = idSchema.parse(cohortId)
  const cohort = await getCohortById(id, context.tenantId)
  if (!cohort) {
    throw new Error('Cohort not found.')
  }

  const provider = getAiTextProvider()
  const system = [
    'You draft a cohort snapshot for facilitators as a suggestion.',
    'Use only the structured roster facts provided.',
    'Do not infer sensitive attributes. No autonomous operational decisions.'
  ].join(' ')

  const roster = cohort.participants
    .slice(0, 80)
    .map((p) => `${p.user.email} (${p.status})`)
    .join('\n')

  const user = [
    `Cohort: ${cohort.name}`,
    `Programme: ${cohort.programme.name}`,
    `Participant count: ${cohort._count.participants}`,
    `Roster sample (up to 80):\n${roster || '(empty)'}`
  ].join('\n')

  const completion = await provider.complete({ system, user })
  const model = resolvedModelId(provider.id)
  const row = await persistSuggestion({
    tenantId: context.tenantId,
    createdByUserId: context.actingUserId,
    kind: 'COHORT_SUMMARY',
    outputText: completion.text,
    outputStructured: completion.structured as Prisma.InputJsonValue | undefined,
    confidenceScore: completion.confidence?.score,
    confidenceLabel: completion.confidence?.label,
    confidenceRationale: completion.confidence?.rationale,
    provider: provider.id,
    model,
    cohortId: id
  })

  return toPublicResult(row, completion, { provider: provider.id, model })
}

export async function suggestParticipantReply(
  participantId: string,
  input: unknown,
  context: { tenantId: string; actingUserId: string }
): Promise<AiSuggestionResult> {
  const id = idSchema.parse(participantId)
  const body = suggestReplyBodySchema.parse(input)
  const participant = await getParticipantById(id, context.tenantId)
  if (!participant) {
    throw new Error('Participant not found.')
  }

  const provider = getAiTextProvider()
  const system = [
    'You suggest wording for a message a staff member might send to a participant.',
    'Tone: supportive, clear, and respectful.',
    'This is only a draft suggestion — humans send the real message.',
    'Never promise payments, legal outcomes, or programme decisions.',
    'If context is missing, say what you would need to know.'
  ].join(' ')

  const profile = participant.profile
  const user = [
    `Participant email: ${participant.user.email}`,
    `Cohort: ${participant.cohort.name} / ${participant.cohort.programme.name}`,
    `Status: ${participant.status}`,
    `Intent hint: ${body.intent ?? 'neutral'}`,
    `Profile bio: ${profile?.bio ?? '(none)'}`,
    `Goals: ${profile?.goals ?? '(none)'}`,
    `Inbound / thread context (if any): ${body.inboundContext ?? '(none provided)'}`
  ].join('\n')

  const completion = await provider.complete({ system, user })
  const model = resolvedModelId(provider.id)
  const row = await persistSuggestion({
    tenantId: context.tenantId,
    createdByUserId: context.actingUserId,
    kind: 'PARTICIPANT_REPLY_DRAFT',
    outputText: completion.text,
    outputStructured: completion.structured as Prisma.InputJsonValue | undefined,
    confidenceScore: completion.confidence?.score,
    confidenceLabel: completion.confidence?.label,
    confidenceRationale: completion.confidence?.rationale,
    provider: provider.id,
    model,
    participantId: id
  })

  return toPublicResult(row, completion, { provider: provider.id, model })
}

export async function listAiSuggestions(params: {
  tenantId: string
  evidenceSubmissionId?: string
  evidenceReviewId?: string
  cohortId?: string
  participantId?: string
  limit?: number
}) {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50)
  const filters = [
    params.evidenceSubmissionId,
    params.evidenceReviewId,
    params.cohortId,
    params.participantId
  ].filter(Boolean)
  if (filters.length !== 1) {
    throw new Error('Provide exactly one entity filter.')
  }

  const where: Prisma.AiSuggestionWhereInput = { tenantId: params.tenantId }
  if (params.evidenceSubmissionId) {
    where.evidenceSubmissionId = idSchema.parse(params.evidenceSubmissionId)
  } else if (params.evidenceReviewId) {
    where.evidenceReviewId = idSchema.parse(params.evidenceReviewId)
  } else if (params.cohortId) {
    where.cohortId = idSchema.parse(params.cohortId)
  } else if (params.participantId) {
    where.participantId = idSchema.parse(params.participantId)
  }

  return prisma.aiSuggestion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      outputText: true,
      outputStructured: true,
      confidenceScore: true,
      confidenceLabel: true,
      confidenceRationale: true,
      provider: true,
      model: true,
      createdAt: true,
      createdByUserId: true
    }
  })
}
