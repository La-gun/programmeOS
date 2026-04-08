import { ConsentType, MessagingChannel, MilestoneStatus } from '@prisma/client'
import { z } from 'zod'

const optionalString = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  return typeof value === 'string' ? value.trim() : value
}, z.string().optional())

const optionalDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  if (typeof value === 'string' || value instanceof String) return new Date(value as string)
  return value
}, z.date().optional())

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  if (typeof value === 'string') return Number(value)
  return value
}, z.number().int().optional())

const dateString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() !== '') return new Date(value)
  return value
}, z.date().optional())

export const programmeCreateSchema = z.object({
  name: z.string().trim().min(1),
  description: optionalString,
  startDate: dateString,
  endDate: dateString
})

export const programmeUpdateSchema = programmeCreateSchema.partial()

export const cohortCreateSchema = z.object({
  programmeId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  startDate: dateString,
  endDate: dateString
})

export const cohortUpdateSchema = cohortCreateSchema.partial()

export const milestoneTemplateCreateSchema = z.object({
  programmeId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: optionalString,
  order: z.preprocess((value) => {
    if (typeof value === 'string') return Number(value)
    return value
  }, z.number().int().min(1)),
  dueDays: optionalNumber
})

export const milestoneTemplateUpdateSchema = milestoneTemplateCreateSchema.partial()

export const idSchema = z.string().trim().min(1)

const participantStatusSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9_-]+$/i, 'Use letters, numbers, underscores, or hyphens.')

export const participantCreateSchema = z.object({
  userId: idSchema,
  cohortId: idSchema,
  status: participantStatusSchema.optional(),
  profile: z
    .object({
      bio: optionalString,
      goals: optionalString,
      skills: optionalString,
      experience: optionalString
    })
    .optional()
})

export const participantUpdateSchema = z.object({
  cohortId: idSchema.optional(),
  status: participantStatusSchema.optional(),
  statusNote: optionalString,
  profile: z
    .object({
      bio: optionalString,
      goals: optionalString,
      skills: optionalString,
      experience: optionalString
    })
    .partial()
    .optional()
})

export const consentUpsertSchema = z.object({
  type: z.nativeEnum(ConsentType),
  consented: z.boolean(),
  version: z.string().trim().min(1),
  ipAddress: optionalString,
  userAgent: optionalString
})

export const consentBatchSchema = z.object({
  items: z.array(consentUpsertSchema).min(1)
})

export const participantChannelAddressUpsertSchema = z
  .object({
    channel: z.nativeEnum(MessagingChannel),
    address: z.string().trim().min(3)
  })
  .transform(({ channel, address }) => {
    const digits = (address.startsWith('+') ? address.slice(1) : address).replace(/\D/g, '')
    return { channel, address: `+${digits}` }
  })
  .superRefine((val, ctx) => {
    const digits = val.address.slice(1)
    if (!digits.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address'], message: 'Address must contain digits' })
    }
    if (val.channel === MessagingChannel.WHATSAPP && digits.length > 0 && digits.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address'],
        message: 'WhatsApp numbers are usually at least 8 digits'
      })
    }
  })

export const evidenceSubmissionCreateSchema = z.object({
  participantMilestoneId: idSchema,
  title: z.string().trim().min(1),
  description: optionalString
})

export const evidenceSubmissionUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: optionalString,
  documentIds: z.array(idSchema).optional()
})

export const evidenceReviewDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve'), feedback: optionalString }),
  z.object({ decision: z.literal('reject'), feedback: z.string().trim().min(1) }),
  z.object({ decision: z.literal('clarify'), feedback: z.string().trim().min(1) })
])

export const assignReviewerSchema = z.object({
  reviewerId: idSchema
})

export const participantMilestoneUpdateSchema = z.object({
  status: z.nativeEnum(MilestoneStatus).optional(),
  notes: optionalString,
  dueDate: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined
    if (typeof value === 'string' || value instanceof String) return new Date(value as string)
    return value
  }, z.date().optional())
})
