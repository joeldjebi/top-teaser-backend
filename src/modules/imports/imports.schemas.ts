import { z } from 'zod'

export const importIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const csvContactRowSchema = z.object({
  email: z.string().trim().email().max(190).toLowerCase(),
  fullName: z.string().trim().min(1).max(190).nullable().optional(),
  mobileNumber: z.string().trim().min(1).max(60).nullable().optional(),
  commune: z.string().trim().min(1).max(120).nullable().optional(),
  country: z.string().trim().min(1).max(120).nullable().optional(),
  firstName: z.string().trim().min(1).max(120).nullable().optional(),
  lastName: z.string().trim().min(1).max(120).nullable().optional(),
})
