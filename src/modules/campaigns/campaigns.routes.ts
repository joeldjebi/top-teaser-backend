import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { findCommunicationProviderById } from '../communication-providers/communication-providers.repository.js'
import { findContactListById } from '../contact-lists/contact-lists.repository.js'
import { findTemplateById } from '../templates/templates.repository.js'
import {
  clearCampaigns,
  createCampaign,
  deleteCampaign,
  findCampaignById,
  getCampaignChannelStatuses,
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
import { drainCampaignQueue, enqueueCampaignJob } from './campaigns.queue.js'
import type {
  Campaign,
  CampaignChannel,
  CampaignSendMode,
  CreateCampaignInput,
} from './campaigns.types.js'

export const campaignsRouter = Router()

campaignsRouter.use(requireAuth)

type ChannelConfigInput = {
  channel: CampaignChannel
  communicationProviderId?: number | null
  templateId?: number | null
  sendMode?: CampaignSendMode
}

function normalizeChannelConfigs(
  input: Pick<
    CreateCampaignInput,
    'channel' | 'communicationProviderId' | 'templateId' | 'sendMode' | 'channels'
  >,
): ChannelConfigInput[] {
  const channels =
    input.channels && input.channels.length > 0
      ? input.channels
      : [
          {
            channel: input.channel ?? 'email',
            communicationProviderId: input.communicationProviderId ?? null,
            templateId: input.templateId,
            sendMode: input.sendMode ?? 'single',
          },
        ]

  const uniqueChannels = new Set<CampaignChannel>()

  return channels.filter((channel) => {
    if (uniqueChannels.has(channel.channel)) return false
    uniqueChannels.add(channel.channel)
    return true
  })
}

async function validateChannelConfigs(
  channels: ChannelConfigInput[],
  fallbackTemplateId: number,
) {
  if (channels.length === 0) {
    return 'Sélectionnez au moins un canal.'
  }

  for (const channel of channels) {
    const templateId = channel.templateId ?? fallbackTemplateId
    const template = await findTemplateById(templateId)

    if (!template) {
      return `Le template du canal ${channel.channel} est introuvable.`
    }

    if (template.channel !== channel.channel) {
      return `Le template « ${template.name} » est de type ${template.channel}. Sélectionnez un template ${channel.channel}.`
    }

    if (channel.channel === 'email') continue

    if (!channel.communicationProviderId) {
      return `Un provider actif est obligatoire pour le canal ${channel.channel}.`
    }

    const communicationProvider = await findCommunicationProviderById(
      channel.communicationProviderId,
    )

    if (
      !communicationProvider ||
      communicationProvider.channel !== channel.channel ||
      !communicationProvider.isActive
    ) {
      return 'Le provider sélectionné est introuvable, inactif ou associé à un autre canal.'
    }
  }

  return null
}

function getCampaignChannelFallback(campaign: Campaign): ChannelConfigInput[] {
  return campaign.channels.length > 0
    ? campaign.channels
    : [
        {
          channel: campaign.channel,
          communicationProviderId: campaign.communicationProviderId,
          templateId: campaign.templateId,
          sendMode: campaign.sendMode,
        },
      ]
}

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

  const channels = normalizeChannelConfigs(parsed.data)
  const channelValidationError = await validateChannelConfigs(
    channels,
    parsed.data.templateId,
  )

  if (channelValidationError) {
    response.status(422).json({
      message: channelValidationError,
    })
    return
  }

  const campaign = await createCampaign({
    ...parsed.data,
    channels,
  })
  wakeCampaignScheduler()

  response.status(201).json({
    data: campaign,
  })
})

campaignsRouter.delete('/', async (_request, response) => {
  response.json({
    data: await clearCampaigns(),
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

  const existingCampaign = await findCampaignById(params.data.id)

  if (!existingCampaign) {
    response.status(404).json({
      message: 'Campaign not found.',
    })
    return
  }

  const shouldValidateChannels =
    body.data.channels !== undefined ||
    body.data.channel !== undefined ||
    body.data.communicationProviderId !== undefined ||
    body.data.templateId !== undefined ||
    body.data.sendMode !== undefined
  const usesLegacyChannelPatch =
    body.data.channels === undefined && shouldValidateChannels

  const channels = shouldValidateChannels
    ? body.data.channels !== undefined
      ? normalizeChannelConfigs({
          channel: body.data.channel ?? existingCampaign.channel,
          communicationProviderId:
            body.data.communicationProviderId ??
            existingCampaign.communicationProviderId,
          templateId: body.data.templateId ?? existingCampaign.templateId,
          sendMode: body.data.sendMode ?? existingCampaign.sendMode,
          channels: body.data.channels,
        })
      : normalizeChannelConfigs({
          channel: body.data.channel ?? existingCampaign.channel,
          communicationProviderId:
            body.data.communicationProviderId ??
            existingCampaign.communicationProviderId,
          templateId: body.data.templateId ?? existingCampaign.templateId,
          sendMode: body.data.sendMode ?? existingCampaign.sendMode,
          channels: usesLegacyChannelPatch
            ? undefined
            : getCampaignChannelFallback(existingCampaign),
        })
    : undefined

  if (channels) {
    const channelValidationError = await validateChannelConfigs(
      channels,
      body.data.templateId ?? existingCampaign.templateId,
    )

    if (channelValidationError) {
      response.status(422).json({
        message: channelValidationError,
      })
      return
    }
  }

  const campaign = await updateCampaign(params.data.id, {
    ...body.data,
    ...(channels ? { channels } : {}),
  })
  wakeCampaignScheduler()

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

  wakeCampaignScheduler()

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

  const result = await prepareCampaign(campaign)
  wakeCampaignScheduler()

  response.json({
    data: result,
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

  const job = enqueueCampaignJob(campaign, 'manual')
  void drainCampaignQueue(async (queuedCampaign, source) => {
    await sendCampaign(queuedCampaign, source)
  })

  response.status(202).json({
    data: {
      jobId: job.id,
      campaign,
      message: 'Campagne ajoutée à la file d’envoi.',
    },
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
  wakeCampaignScheduler()

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
    data: await syncCampaignBulkStatus(campaign, 'manual'),
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

campaignsRouter.get('/:id/channel-statuses', async (request, response) => {
  const parsed = campaignIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid campaign id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  response.json({
    data: await getCampaignChannelStatuses(parsed.data.id),
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
