import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../auth/auth.middleware.js'
import { env } from '../../config/env.js'
import { createEmailEvent } from './webhooks.repository.js'
import { registerWassengerWebhook } from './wassenger-webhooks.service.js'

const providerParamSchema = z.object({
  provider: z.enum([
    'postmark',
    'sendgrid',
    'mailgun',
    'brevo',
    'amazon-ses',
    'twilio',
    'meta-whatsapp',
    'wassenger',
    'telegram',
    'generic',
  ]),
})

export const webhooksRouter = Router()

const registerWassengerWebhookSchema = z.object({
  device: z.string().regex(/^[0-9A-Fa-f]{24}$/).optional(),
  events: z.array(z.string()).min(1).max(13).optional(),
  name: z.string().min(1).max(30).optional(),
  url: z.string().url().optional(),
})

webhooksRouter.post(
  '/wassenger/register',
  requireAuth,
  requirePermission('providers', 'update'),
  async (request, response) => {
    const parsed = registerWassengerWebhookSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Configuration webhook Wassenger invalide.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    try {
      response.status(201).json({
        data: await registerWassengerWebhook(parsed.data),
      })
    } catch (error) {
      response.status(502).json({
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de créer le webhook Wassenger.',
      })
    }
  },
)

webhooksRouter.post('/:provider', async (request, response) => {
  const parsed = providerParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(404).json({
      message: 'Webhook provider not supported.',
    })
    return
  }

  if (
    parsed.data.provider === 'wassenger' &&
    env.wassenger.webhookSecret &&
    request.query.token !== env.wassenger.webhookSecret &&
    request.header('x-top-teaser-webhook-secret') !== env.wassenger.webhookSecret
  ) {
    response.status(401).json({
      message: 'Webhook token invalide.',
    })
    return
  }

  const payload = request.body as Record<string, unknown>
  const providerMessageId =
    getString(payload.MessageID) ??
    getString(payload.MessageId) ??
    getString(payload.message_id) ??
    getString(payload.MessageSid) ??
    getString(payload.SmsSid) ??
    getString(payload.sid) ??
    getString(payload.sg_message_id) ??
    getString(payload.id) ??
    getString(payload.message) ??
    findNestedString(payload, [
      'id',
      'messageId',
      'message_id',
      'wid',
      'wamid',
      'waMessageId',
    ])
  const eventType =
    getString(payload.RecordType) ??
    getString(payload.event) ??
    getString(payload.Event) ??
    getString(payload.MessageStatus) ??
    getString(payload.SmsStatus) ??
    getString(payload.status) ??
    getString(payload.state) ??
    getString(payload.type) ??
    findNestedString(payload, ['event', 'status', 'state', 'type']) ??
    'unknown'

  await createEmailEvent({
    provider: parsed.data.provider,
    providerMessageId,
    eventType,
    payload,
  })

  response.json({
    message: 'Webhook received.',
  })
})

function getString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function findNestedString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined

  const record = value as Record<string, unknown>

  for (const key of keys) {
    const direct = getString(record[key])

    if (direct) return direct
  }

  for (const nestedValue of Object.values(record)) {
    if (Array.isArray(nestedValue)) {
      for (const item of nestedValue) {
        const nested = findNestedString(item, keys)

        if (nested) return nested
      }
      continue
    }

    const nested = findNestedString(nestedValue, keys)

    if (nested) return nested
  }

  return undefined
}
