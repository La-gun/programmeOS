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
