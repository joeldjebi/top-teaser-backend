import { z } from 'zod'

export const contactStatusSchema = z.enum([
  'active',
  'invalid',
  'bounced',
  'unsubscribed',
])

export const contactIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const createContactSchema = z.object({
  email: z.string().trim().email().max(190).toLowerCase(),
  fullName: z.string().trim().min(1).max(190).nullable().optional(),
  mobileNumber: z.string().trim().min(1).max(60).nullable().optional(),
  commune: z.string().trim().min(1).max(120).nullable().optional(),
  country: z.string().trim().min(1).max(120).nullable().optional(),
  firstName: z.string().trim().min(1).max(120).nullable().optional(),
  lastName: z.string().trim().min(1).max(120).nullable().optional(),
  status: contactStatusSchema.default('active').optional(),
})

export const updateContactSchema = z
  .object({
    email: z.string().trim().email().max(190).toLowerCase().optional(),
    fullName: z.string().trim().min(1).max(190).nullable().optional(),
    mobileNumber: z.string().trim().min(1).max(60).nullable().optional(),
    commune: z.string().trim().min(1).max(120).nullable().optional(),
    country: z.string().trim().min(1).max(120).nullable().optional(),
    firstName: z.string().trim().min(1).max(120).nullable().optional(),
    lastName: z.string().trim().min(1).max(120).nullable().optional(),
    status: contactStatusSchema.optional(),
    unsubscribedAt: z.string().datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })
