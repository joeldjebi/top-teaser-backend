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
export const campaignChannelSchema = z.enum(['email', 'sms', 'whatsapp', 'telegram'])

export const campaignChannelConfigSchema = z.object({
  channel: campaignChannelSchema,
  communicationProviderId: z.number().int().positive().nullable().optional(),
  sendMode: campaignSendModeSchema.default('single'),
})

export const campaignIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(255),
  templateId: z.number().int().positive(),
  contactListId: z.number().int().positive(),
  channel: campaignChannelSchema.default('email'),
  communicationProviderId: z.number().int().positive().nullable().optional(),
  sendMode: campaignSendModeSchema.default('single'),
  channels: z.array(campaignChannelConfigSchema).min(1).optional(),
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
