import { z } from 'zod'

export const communicationProviderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const providerVariableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  label: z.string().trim().min(1).max(160),
  secret: z.boolean().default(false),
  required: z.boolean().default(true),
  value: z.string().trim().max(1000).optional(),
})

const providerLimitsSchema = z.object({
  maxPerMinute: z.coerce.number().int().min(1).max(100000).default(60),
  maxPerHour: z.coerce.number().int().min(1).max(1000000).default(1000),
  maxPerDay: z.coerce.number().int().min(1).max(10000000).default(10000),
  batchSize: z.coerce.number().int().min(1).max(10000).default(100),
})

export const createCommunicationProviderSchema = z.object({
  channel: z.enum(['sms', 'whatsapp', 'telegram']),
  name: z.string().trim().min(1).max(160),
  providerKey: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  isActive: z.boolean().default(false),
  variables: z.array(providerVariableSchema).min(1).max(30),
  limits: providerLimitsSchema,
})

export const updateCommunicationProviderSchema =
  createCommunicationProviderSchema.partial()
