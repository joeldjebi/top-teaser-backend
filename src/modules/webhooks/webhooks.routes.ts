import { Router } from 'express'
import { z } from 'zod'
import { createEmailEvent } from './webhooks.repository.js'

const providerParamSchema = z.object({
  provider: z.enum(['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses']),
})

export const webhooksRouter = Router()

webhooksRouter.post('/:provider', async (request, response) => {
  const parsed = providerParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(404).json({
      message: 'Webhook provider not supported.',
    })
    return
  }

  const payload = request.body as Record<string, unknown>
  const providerMessageId =
    getString(payload.MessageID) ??
    getString(payload.MessageId) ??
    getString(payload.message_id) ??
    getString(payload.sg_message_id) ??
    getString(payload.id)
  const eventType =
    getString(payload.RecordType) ??
    getString(payload.event) ??
    getString(payload.Event) ??
    getString(payload.type) ??
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
