import { z } from 'zod'

export const templateIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(255),
  htmlContent: z.string().trim().min(1),
  textContent: z.string().trim().min(1).nullable().optional(),
})

export const updateTemplateSchema = createTemplateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })

export const previewTemplateSchema = z.object({
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
})

export const testSendTemplateSchema = z.object({
  to: z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(1).max(160).optional(),
  }),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
})
