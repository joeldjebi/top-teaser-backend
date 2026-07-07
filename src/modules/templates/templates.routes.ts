import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getMailSetting } from '../mail/mail-settings.service.js'
import { getMailProvider } from '../mail/providers/provider-registry.js'
import {
  createTemplate,
  deleteTemplate,
  findTemplateById,
  listTemplates,
  updateTemplate,
} from './templates.repository.js'
import { renderTemplate } from './templates.renderer.js'
import {
  createTemplateSchema,
  previewTemplateSchema,
  templateIdParamSchema,
  testSendTemplateSchema,
  updateTemplateSchema,
} from './templates.schemas.js'

export const templatesRouter = Router()

templatesRouter.use(requireAuth)

templatesRouter.get('/', async (_request, response) => {
  response.json({
    data: await listTemplates(),
  })
})

templatesRouter.post('/', async (request, response) => {
  const parsed = createTemplateSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid template payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const template = await createTemplate(parsed.data)

  response.status(201).json({
    data: template,
  })
})

templatesRouter.get('/:id', async (request, response) => {
  const parsed = templateIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid template id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const template = await findTemplateById(parsed.data.id)

  if (!template) {
    response.status(404).json({
      message: 'Template not found.',
    })
    return
  }

  response.json({
    data: template,
  })
})

templatesRouter.patch('/:id', async (request, response) => {
  const params = templateIdParamSchema.safeParse(request.params)
  const body = updateTemplateSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid template update payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const template = await updateTemplate(params.data.id, body.data)

  if (!template) {
    response.status(404).json({
      message: 'Template not found.',
    })
    return
  }

  response.json({
    data: template,
  })
})

templatesRouter.delete('/:id', async (request, response) => {
  const parsed = templateIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid template id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const deleted = await deleteTemplate(parsed.data.id)

  if (!deleted) {
    response.status(404).json({
      message: 'Template not found.',
    })
    return
  }

  response.status(204).send()
})

templatesRouter.post('/:id/preview', async (request, response) => {
  const params = templateIdParamSchema.safeParse(request.params)
  const body = previewTemplateSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid template preview payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const template = await findTemplateById(params.data.id)

  if (!template) {
    response.status(404).json({
      message: 'Template not found.',
    })
    return
  }

  response.json({
    data: renderTemplate(template, body.data.variables),
  })
})

templatesRouter.post('/:id/test-send', async (request, response) => {
  const params = templateIdParamSchema.safeParse(request.params)
  const body = testSendTemplateSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid template test-send payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const template = await findTemplateById(params.data.id)

  if (!template) {
    response.status(404).json({
      message: 'Template not found.',
    })
    return
  }

  const rendered = renderTemplate(template, body.data.variables)
  const provider = await getMailProvider()

  try {
    const result = await provider.send({
      from: {
        email: getMailSetting('MAIL_FROM') ?? 'no-reply@to-teaser.com',
      },
      to: body.data.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text ?? undefined,
      metadata: {
        templateId: template.id,
        type: 'template-test',
      },
    })

    response.json({
      data: result,
    })
  } catch (error) {
    response.status(502).json({
      message:
        error instanceof Error ? error.message : 'Email provider test send failed.',
    })
  }
})
