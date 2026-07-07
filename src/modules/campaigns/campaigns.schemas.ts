import { z } from 'zod'

export const campaignStatusSchema = z.enum([
  'draft',
  'ready',
  'sending',
  'sent',
  'failed',
  'cancelled',
])

export const campaignSendModeSchema = z.enum(['single', 'bulk'])

export const campaignIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(255),
  templateId: z.number().int().positive(),
  contactListId: z.number().int().positive(),
  sendMode: campaignSendModeSchema.default('single'),
  scheduledAt: z.string().datetime().nullable().optional(),
})

export const updateCampaignSchema = createCampaignSchema
  .partial()
  .extend({
    status: campaignStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })
