import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  getMailSettingsSnapshot,
  getMailSetting,
  updateMailSettings,
} from './mail-settings.service.js'
import { getMailProvider, listMailProviders } from './providers/provider-registry.js'

export const mailRouter = Router()

const testMailSchema = z.object({
  to: z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(1).max(160).optional(),
  }),
  subject: z.string().trim().min(1).max(255).default('Top Teaser test email'),
  html: z.string().trim().min(1).default('<p>Top Teaser test email</p>'),
  text: z.string().trim().min(1).optional(),
})

const mailSettingsSchema = z.object({
  provider: z
    .enum(['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses'])
    .optional(),
  from: z.string().trim().email().optional(),
  config: z.record(z.string(), z.string()).optional(),
})

mailRouter.use(requireAuth)

mailRouter.get('/providers', async (_request, response) => {
  response.json({
    data: await listMailProviders(),
  })
})

mailRouter.get('/providers/active', async (_request, response) => {
  const provider = await getMailProvider()

  response.json({
    data: {
      key: provider.key,
      name: provider.name,
      health: provider.getHealth(),
    },
  })
})

mailRouter.get('/settings', async (_request, response) => {
  response.json({
    data: await getMailSettingsSnapshot(),
  })
})

mailRouter.patch('/settings', async (request, response) => {
  const parsed = mailSettingsSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid mail settings payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  response.json({
    data: await updateMailSettings(parsed.data),
  })
})

mailRouter.post('/test', async (request, response) => {
  const parsed = testMailSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid mail test payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  try {
    const provider = await getMailProvider()
    const result = await provider.send({
      from: {
        email: getMailSetting('MAIL_FROM') ?? 'no-reply@to-teaser.com',
      },
      to: parsed.data.to,
      subject: parsed.data.subject,
      html: parsed.data.html,
      text: parsed.data.text,
      metadata: {
        type: 'provider-test',
      },
    })

    response.json({
      data: result,
    })
  } catch (error) {
    response.status(502).json({
      message:
        error instanceof Error ? error.message : 'Email provider test failed.',
    })
  }
})
