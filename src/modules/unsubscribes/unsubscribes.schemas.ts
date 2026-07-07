import { z } from 'zod'

export const unsubscribeSchema = z
  .object({
    token: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((value) => value.token || value.email, {
    message: 'token or email is required.',
  })

export const createSuppressionSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  reason: z.enum(['unsubscribed', 'bounce', 'complaint', 'manual']),
})

export const suppressionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
