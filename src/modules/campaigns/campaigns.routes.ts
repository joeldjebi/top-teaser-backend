import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { findContactListById } from '../contact-lists/contact-lists.repository.js'
import { findTemplateById } from '../templates/templates.repository.js'
import {
  createCampaign,
  deleteCampaign,
  findCampaignById,
  getCampaignStats,
  listCampaignRecipients,
  listCampaigns,
  updateCampaign,
  updateCampaignStatus,
} from './campaigns.repository.js'
import {
  campaignIdParamSchema,
  createCampaignSchema,
  updateCampaignSchema,
} from './campaigns.schemas.js'
import { wakeCampaignScheduler } from './campaigns.scheduler.js'
import {
  prepareCampaign,
  sendCampaign,
  syncCampaignBulkStatus,
} from './campaigns.service.js'

export const campaignsRouter = Router()

campaignsRouter.use(requireAuth)

campaignsRouter.get('/', async (_request, response) => {
  response.json({
    data: await listCampaigns(),
  })
})

campaignsRouter.post('/', async (request, response) => {
  const parsed = createCampaignSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const [template, contactList] = await Promise.all([
    findTemplateById(parsed.data.templateId),
    findContactListById(parsed.data.contactListId),
  ])

  if (!template || !contactList) {
    response.status(404).json({
      message: !template ? 'Template not found.' : 'Contact list not found.',
    })
    return
  }

  const campaign = await createCampaign(parsed.data)
  wakeCampaignScheduler()

  response.status(201).json({
    data: campaign,
  })
})

campaignsRouter.get('/:id', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  wakeCampaignScheduler()

  response.json({
    data: campaign,
  })
})

campaignsRouter.patch('/:id', async (request, response) => {
  const params = campaignIdParamSchema.safeParse(request.params)
  const body = updateCampaignSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid campaign update payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const campaign = await updateCampaign(params.data.id, body.data)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  response.json({
    data: campaign,
  })
})

campaignsRouter.delete('/:id', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const deleted = await deleteCampaign(parsed.data.id)

  if (!deleted) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  response.status(204).send()
})

campaignsRouter.post('/:id/prepare', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  response.json({
    data: await prepareCampaign(campaign),
  })
})

campaignsRouter.post('/:id/send', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  if (campaign.status === 'cancelled') {
    response.status(409).json({
      message: 'Cancelled campaign cannot be sent.',
    })
    return
  }

  response.json({
    data: await sendCampaign(campaign, 'manual'),
  })
})

campaignsRouter.post('/:id/cancel', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  await updateCampaignStatus(campaign.id, 'cancelled')

  response.json({
    data: await findCampaignById(campaign.id),
  })
})

campaignsRouter.get('/:id/bulk-status', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  response.json({
    data: await syncCampaignBulkStatus(campaign),
  })
})

campaignsRouter.get('/:id/stats', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  response.json({
    data: await getCampaignStats(campaign.id),
  })
})

campaignsRouter.get('/:id/recipients', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const campaign = await findCampaignById(parsed.data.id)

  if (!campaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  response.json({
    data: await listCampaignRecipients(campaign.id),
  })
})
