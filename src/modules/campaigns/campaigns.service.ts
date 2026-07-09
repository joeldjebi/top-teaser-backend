import { getMailSetting } from '../mail/mail-settings.service.js'
import { getMailProvider } from '../mail/providers/provider-registry.js'
import { findCommunicationProviderById } from '../communication-providers/communication-providers.repository.js'
import type { CommunicationProvider } from '../communication-providers/communication-providers.types.js'
import {
  buildWassengerMessageRequest,
  extractWassengerMessageId,
  isWassengerProvider,
} from '../communication-providers/adapters/wassenger.provider.js'
import { findTemplateById } from '../templates/templates.repository.js'
import { renderTemplate } from '../templates/templates.renderer.js'
import { createTechnicalLog } from '../technical-logs/technical-logs.repository.js'
import { createUnsubscribeToken } from '../unsubscribes/unsubscribe-token.js'
import { env } from '../../config/env.js'
import type {
  Campaign,
  CampaignChannelConfig,
  CampaignChannelRecipient,
} from './campaigns.types.js'
import {
  attachCampaignChannelRecipientProviderMessage,
  attachRecipientProviderMessage,
  findCampaignById,
  getCampaignStats,
  listCampaignRecipients,
  listPendingCampaignChannelRecipients,
  listPendingCampaignRecipients,
  markCampaignChannelRecipientFailed,
  markCampaignChannelRecipientSent,
  markCampaignChannelRecipientsFailedByProviderRequest,
  markCampaignChannelRecipientsSentByProviderRequest,
  markRecipientFailed,
  markRecipientSent,
  prepareCampaignChannelRecipients,
  prepareCampaignRecipients,
  updateCampaign,
  updateCampaignChannelStatus,
  updateCampaignStatus,
} from './campaigns.repository.js'

export async function prepareCampaign(campaign: Campaign) {
  const preparedRecipients = await prepareCampaignRecipients(campaign)
  const stats = await getCampaignStats(campaign.id)
  const updatedCampaign = await findCampaignById(campaign.id)

  return {
    campaign: updatedCampaign ?? campaign,
    preparedRecipients,
    stats,
  }
}

type CampaignSendSource = 'manual' | 'cron'
type ChannelExecutionResult = {
  sent: number
  failed: number
  errorMessage?: string | null
  pending?: boolean
}

export async function sendCampaign(
  campaign: Campaign,
  source: CampaignSendSource = 'manual',
) {
  await updateCampaignStatus(campaign.id, 'sending')

  const stats = await getCampaignStats(campaign.id)
  if (stats.total === 0) {
    await prepareCampaignRecipients(campaign)
  }

  const channels = campaign.channels.length > 0
    ? campaign.channels
    : [
        {
          id: 0,
          campaignId: campaign.id,
          channel: campaign.channel,
          communicationProviderId: campaign.communicationProviderId,
          sendMode: campaign.sendMode,
          status: campaign.status,
          errorMessage: campaign.errorMessage,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
      ]

  let sent = 0
  let failed = 0
  let pending = false
  const errors: string[] = []

  for (const channel of channels) {
    if (!channel.id) {
      errors.push(`Canal ${channel.channel} sans identifiant technique.`)
      failed += 1
      continue
    }

    try {
      await updateCampaignChannelStatus({
        campaignChannelId: channel.id,
        status: 'sending',
        errorMessage: null,
      })

      const result =
        channel.channel === 'email'
          ? await sendEmailCampaignChannel(campaign, channel, source)
          : await sendCommunicationCampaignChannel(campaign, channel, source)

      sent += result.sent
      failed += result.failed
      pending = pending || Boolean(result.pending)

      await updateCampaignChannelStatus({
        campaignChannelId: channel.id,
        status: result.pending
          ? 'sending'
          : result.failed > 0 && result.sent === 0
            ? 'failed'
            : 'sent',
        errorMessage: result.errorMessage,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Échec du canal.'
      failed += 1
      errors.push(`${formatChannelLabel(channel.channel)} : ${errorMessage}`)
      await updateCampaignChannelStatus({
        campaignChannelId: channel.id,
        status: 'failed',
        errorMessage,
      })
    }
  }

  const finalStatus = pending ? 'sending' : sent > 0 ? 'sent' : 'failed'
  const errorMessage =
    errors.length > 0
      ? `${errors.length} canal(aux) en erreur : ${errors.join(' | ')}`
      : null

  await updateCampaign(campaign.id, {
    status: finalStatus,
    errorMessage,
  })

  const updatedCampaign = await findCampaignById(campaign.id)

  return {
    campaign: updatedCampaign ?? campaign,
    sent,
    failed,
    stats: await getCampaignStats(campaign.id),
  }
}

async function sendEmailCampaignChannel(
  campaign: Campaign,
  selectedEmailChannel: CampaignChannelConfig,
  source: CampaignSendSource = 'manual',
): Promise<ChannelExecutionResult> {
  const emailChannel =
    campaign.channels.find((channel) => channel.channel === 'email') ??
    selectedEmailChannel

  if (!emailChannel) {
    throw new Error(
      'Aucun canal email n’est configuré pour cette campagne. Les moteurs SMS, WhatsApp et Telegram seront branchés dans l’étape multicanal.',
    )
  }

  const emailSendMode = emailChannel.sendMode
  const template = await findTemplateById(campaign.templateId)

  if (!template) {
    throw new Error('Campaign template not found.')
  }

  await updateCampaignStatus(campaign.id, 'sending')

  const provider = await getMailProvider()
  if (selectedEmailChannel.id) {
    await prepareCampaignChannelRecipients({
      campaignId: campaign.id,
      campaignChannelId: selectedEmailChannel.id,
    })
  }

  let recipients = selectedEmailChannel.id
    ? await listPendingCampaignChannelRecipients(selectedEmailChannel.id)
    : await listPendingCampaignRecipients(campaign.id)
  let sent = 0
  let failed = 0
  let bulkErrorMessage = ''
  const recipientErrors: string[] = []

  if (recipients.length === 0) {
    await prepareCampaignRecipients(campaign)
    if (selectedEmailChannel.id) {
      await prepareCampaignChannelRecipients({
        campaignId: campaign.id,
        campaignChannelId: selectedEmailChannel.id,
      })
    }
    recipients = selectedEmailChannel.id
      ? await listPendingCampaignChannelRecipients(selectedEmailChannel.id)
      : await listPendingCampaignRecipients(campaign.id)
  }

  if (recipients.length === 0) {
    const errorMessage =
      'Aucun destinataire éligible à envoyer. Vérifiez que la liste contient des contacts actifs, non désabonnés et non supprimés.'

    await updateCampaign(campaign.id, {
      status: 'failed',
      errorMessage,
    })

    return {
      sent,
      failed,
      errorMessage,
    }
  }

  const sendBulk = provider.sendBulk?.bind(provider)
  const canUseBulk = Boolean(sendBulk) && emailSendMode === 'bulk'

  if (emailSendMode === 'bulk' && !isPostmarkModeEnabled('bulk')) {
    throw new Error(
      'Le mode Bulk Postmark est désactivé. Activez-le dans Providers ou choisissez le mode classique.',
    )
  }

  if (emailSendMode === 'single' && !isPostmarkModeEnabled('single')) {
    throw new Error(
      'Le mode classique Postmark est désactivé. Activez-le dans Providers ou choisissez un autre mode.',
    )
  }

  if (canUseBulk) {
    try {
      const payload = {
        from: {
          email: getMailSetting('MAIL_FROM') ?? 'no-reply@to-teaser.com',
        },
        subject: campaign.subject || template.subject,
        html: template.htmlContent,
        text: template.textContent ?? undefined,
        tag: `campaign-${campaign.id}`,
        metadata: {
          campaignId: campaign.id,
          templateId: template.id,
        },
        recipients: recipients.map((recipient) => ({
          id: recipient.id,
          contactId: recipient.contactId,
          to: {
            email: recipient.contact.email,
            name:
              recipient.contact.fullName ||
              [recipient.contact.firstName, recipient.contact.lastName]
                .filter(Boolean)
                .join(' ') ||
              undefined,
          },
          variables: getTemplateVariables(recipient.contact),
          metadata: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            contactId: recipient.contactId,
          },
        })),
      }

      logCampaignPayload({
        campaign,
        mode: 'bulk',
        payload,
        providerName: provider.name,
        recipientCount: recipients.length,
        source,
      })

      const result = await sendBulk!(payload)
      const bulkRequestId = result.bulkRequestId

      if (!bulkRequestId) {
        throw new Error('Postmark a accepté la requête Bulk sans retourner d’identifiant de suivi.')
      }

      logCampaignResponse({
        campaign,
        mode: 'bulk',
        response: result,
        source,
      })

      for (const recipient of recipients) {
        await attachRecipientProviderMessage({
          recipientId: recipient.id,
          providerMessageId: `${bulkRequestId}:${recipient.id}`,
        })
        const channelRecipientId = getChannelRecipientId(recipient)
        if (channelRecipientId) {
          await attachCampaignChannelRecipientProviderMessage({
            channelRecipientId,
            providerMessageId: `${bulkRequestId}:${recipient.id}`,
          })
        }
      }

      if (result.status === 'failed') {
        throw new Error('Postmark a refusé la requête Bulk.')
      }
    } catch (error) {
      bulkErrorMessage =
        error instanceof Error ? error.message : 'Email provider bulk send failed.'

      logCampaignError({
        campaign,
        error,
        message: bulkErrorMessage,
        mode: 'bulk',
        source,
      })

      for (const recipient of recipients) {
        await markRecipientFailed({
          recipientId: recipient.id,
          errorMessage: bulkErrorMessage,
        })
        const channelRecipientId = getChannelRecipientId(recipient)
        if (channelRecipientId) {
          await markCampaignChannelRecipientFailed({
            channelRecipientId,
            errorMessage: bulkErrorMessage,
          })
        }
      }

      failed = recipients.length
    }

    if (failed === recipients.length) {
      await updateCampaign(campaign.id, {
        status: 'failed',
        errorMessage: bulkErrorMessage || 'Email provider bulk send failed.',
      })
    } else {
      await updateCampaign(campaign.id, {
        status: 'sending',
        errorMessage:
          'Postmark a accepté la requête Bulk. Le statut final sera synchronisé automatiquement.',
      })
    }
    return {
      sent,
      failed,
      errorMessage:
        failed > 0
          ? bulkErrorMessage || 'Email provider bulk send failed.'
          : null,
      pending: failed === 0,
    }
  }

  if (emailSendMode === 'bulk' && !provider.sendBulk) {
    throw new Error('Le provider actif ne supporte pas l’envoi Bulk.')
  }

  for (const recipient of recipients) {
    const templateVariables = getTemplateVariables(recipient.contact)
    const rendered = renderTemplate(
      {
        ...template,
        subject: campaign.subject || template.subject,
      },
      templateVariables,
    )

    try {
      const payload = {
        from: {
          email: getMailSetting('MAIL_FROM') ?? 'no-reply@to-teaser.com',
        },
        to: {
          email: recipient.contact.email,
          name:
            recipient.contact.fullName ||
            [recipient.contact.firstName, recipient.contact.lastName]
              .filter(Boolean)
              .join(' ') ||
            undefined,
        },
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text ?? undefined,
        metadata: {
          campaignId: campaign.id,
          recipientId: recipient.id,
          contactId: recipient.contactId,
        },
      }

      console.log(
        `[Campaigns][${source}] Sending email to ${recipient.contact.email} (campaign ${campaign.id}, recipient ${recipient.id})...`,
      )
      logCampaignPayload({
        campaign,
        mode: 'single',
        payload,
        providerName: provider.name,
        recipientCount: 1,
        source,
      })

      const result = await provider.send(payload)

      logCampaignResponse({
        campaign,
        mode: 'single',
        response: result,
        source,
      })

      await markRecipientSent({
        recipientId: recipient.id,
        providerMessageId: result.providerMessageId,
      })
      const channelRecipientId = getChannelRecipientId(recipient)
      if (channelRecipientId) {
        await markCampaignChannelRecipientSent({
          channelRecipientId,
          providerMessageId: result.providerMessageId,
        })
      }
      sent += 1
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Email provider send failed.'
      recipientErrors.push(errorMessage)
      
      logCampaignError({
        campaign,
        error,
        message: errorMessage,
        mode: 'single',
        source,
      })

      await markRecipientFailed({
        recipientId: recipient.id,
        errorMessage,
      })
      const channelRecipientId = getChannelRecipientId(recipient)
      if (channelRecipientId) {
        await markCampaignChannelRecipientFailed({
          channelRecipientId,
          errorMessage,
        })
      }
      failed += 1
    }
  }

  if (failed === recipients.length && sent === 0) {
    const firstError = recipientErrors[0]

    await updateCampaign(campaign.id, {
      status: 'failed',
      errorMessage: firstError
        ? `Tous les envois ont échoué. Première erreur : ${firstError}`
        : 'Tous les envois ont échoué. Vérifiez les destinataires et la configuration du provider email.',
    })
  } else if (failed > 0) {
    const firstError = recipientErrors[0]

    await updateCampaign(campaign.id, {
      status: 'sent',
      errorMessage: firstError
        ? `${failed} email(s) sur ${recipients.length} n’ont pas pu être envoyés. Première erreur : ${firstError}`
        : `${failed} email(s) sur ${recipients.length} n’ont pas pu être envoyés.`,
    })
  } else {
    await updateCampaignStatus(campaign.id, 'sent')
  }
  return {
    sent,
    failed,
    errorMessage: recipientErrors[0] ?? null,
  }
}

async function sendCommunicationCampaignChannel(
  campaign: Campaign,
  channel: CampaignChannelConfig,
  source: CampaignSendSource,
): Promise<ChannelExecutionResult> {
  if (!channel.communicationProviderId) {
    throw new Error(`Aucun provider configuré pour le canal ${channel.channel}.`)
  }

  const [provider, template] = await Promise.all([
    findCommunicationProviderById(channel.communicationProviderId),
    findTemplateById(campaign.templateId),
  ])

  if (!provider || !provider.isActive || provider.channel !== channel.channel) {
    throw new Error('Provider introuvable, inactif ou associé à un autre canal.')
  }

  if (!template) {
    throw new Error('Campaign template not found.')
  }

  await prepareCampaignChannelRecipients({
    campaignId: campaign.id,
    campaignChannelId: channel.id,
  })

  const recipients = await listPendingCampaignChannelRecipients(channel.id)
  let sent = 0
  let failed = 0
  const errors: string[] = []

  if (
    isWassengerProvider(provider) &&
    recipients.length > provider.limits.batchSize
  ) {
    throw new Error(
      `La campagne WhatsApp contient ${recipients.length} destinataire(s), au-dessus de la limite Wassenger configurée (${provider.limits.batchSize}).`,
    )
  }

  for (const [index, recipient] of recipients.entries()) {
    const variables = getTemplateVariables(recipient.contact)
    const rendered = renderTemplate(
      {
        ...template,
        subject: campaign.subject || template.subject,
      },
      variables,
    )
    const message = normalizeMessageText(rendered.text ?? rendered.html)

    try {
      const response = await sendCommunicationMessage({
        campaign,
        channel,
        message,
        provider,
        recipient,
        source,
      })

      await markCampaignChannelRecipientSent({
        channelRecipientId: recipient.channelRecipientId,
        providerMessageId: response.providerMessageId,
      })
      sent += 1
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Échec d’envoi multicanal.'
      errors.push(errorMessage)
      await markCampaignChannelRecipientFailed({
        channelRecipientId: recipient.channelRecipientId,
        errorMessage,
      })
      failed += 1
    }

    if (index < recipients.length - 1) {
      await waitForProviderRateLimit(provider)
    }
  }

  return {
    sent,
    failed,
    errorMessage: errors[0] ?? null,
  }
}

async function sendCommunicationMessage(input: {
  campaign: Campaign
  channel: CampaignChannelConfig
  message: string
  provider: CommunicationProvider
  recipient: CampaignChannelRecipient
  source: CampaignSendSource
}) {
  const request = buildCommunicationRequest(input)

  logCampaignPayload({
    campaign: input.campaign,
    channel: input.channel.channel,
    mode: 'single',
    payload: request.payload,
    providerName: input.provider.name,
    recipientCount: 1,
    source: input.source,
  })

  const response = await fetch(request.endpoint, {
    body: JSON.stringify(request.payload),
    headers: request.headers,
    method: request.method,
  })
  const text = await response.text()
  const data = parseProviderResponse(text)

  logCampaignResponse({
    campaign: input.campaign,
    channel: input.channel.channel,
    mode: 'single',
    response: data,
    source: input.source,
  })

  if (!response.ok) {
    throw new Error(
      `${formatChannelLabel(input.channel.channel)} provider error (${response.status}): ${text || response.statusText}`,
    )
  }

  return {
    providerMessageId:
      extractCommunicationProviderMessageId(input.provider, data) ??
      `${input.channel.channel}:${input.recipient.channelRecipientId}`,
  }
}

function buildCommunicationRequest(input: {
  message: string
  provider: CommunicationProvider
  recipient: CampaignChannelRecipient
}) {
  if (isWassengerProvider(input.provider)) {
    return buildWassengerMessageRequest({
      message: input.message,
      phone: getRecipientValue(input.provider, input.recipient),
      provider: input.provider,
    })
  }

  return {
    endpoint: getCommunicationEndpoint(input.provider, input.recipient),
    headers: buildCommunicationHeaders(input.provider),
    method: (getProviderVariable(input.provider, 'method') ?? 'POST') as
      | 'DELETE'
      | 'GET'
      | 'PATCH'
      | 'POST'
      | 'PUT',
    payload: buildCommunicationPayload(input),
  }
}

function getCommunicationEndpoint(
  provider: CommunicationProvider,
  recipient: CampaignChannelRecipient,
) {
  if (provider.channel === 'telegram') {
    const botToken = getProviderVariable(provider, 'bot_token')
    if (botToken) {
      return `https://api.telegram.org/bot${botToken}/sendMessage`
    }
  }

  const endpoint =
    getProviderVariable(provider, 'api_url') ??
    getProviderVariable(provider, 'endpoint_url') ??
    getProviderVariable(provider, 'url')

  if (!endpoint) {
    throw new Error(
      `Configurez la variable api_url sur le provider ${provider.name}.`,
    )
  }

  return renderStringTemplate(endpoint, {
    ...getTemplateVariables(recipient.contact),
    providerKey: provider.providerKey,
  })
}

function buildCommunicationPayload(input: {
  message: string
  provider: CommunicationProvider
  recipient: CampaignChannelRecipient
}) {
  const recipientValue = getRecipientValue(input.provider, input.recipient)
  const customPayload = getProviderVariable(input.provider, 'payload_json')

  if (customPayload) {
    return parseJsonPayload(
      renderStringTemplate(customPayload, {
        ...getTemplateVariables(input.recipient.contact),
        message: input.message,
        recipient: recipientValue,
      }),
    )
  }

  if (input.provider.channel === 'telegram') {
    return {
      chat_id: recipientValue,
      text: input.message,
      parse_mode: getProviderVariable(input.provider, 'parse_mode') ?? undefined,
    }
  }

  if (input.provider.channel === 'whatsapp') {
    return {
      messaging_product: 'whatsapp',
      to: recipientValue,
      type: 'text',
      text: {
        body: input.message,
      },
    }
  }

  return {
    from:
      getProviderVariable(input.provider, 'from') ??
      getProviderVariable(input.provider, 'sender') ??
      undefined,
    message: input.message,
    to: recipientValue,
  }
}

export async function syncCampaignBulkStatus(
  campaign: Campaign,
  source: CampaignSendSource = 'manual',
) {
  const provider = await getMailProvider()

  if (!provider.getBulkStatus) {
    throw new Error('Le provider actif ne supporte pas le suivi Bulk.')
  }

  const recipients = await listCampaignRecipients(campaign.id)
  const bulkRequestId = recipients
    .map((recipient) => recipient.providerMessageId?.split(':')[0])
    .find((value): value is string => Boolean(value))

  if (!bulkRequestId) {
    throw new Error('Aucune requête Bulk Postmark n’est associée à cette campagne.')
  }

  const bulkStatus = await provider.getBulkStatus(bulkRequestId)

  logCampaignResponse({
    campaign,
    mode: 'bulk',
    response: bulkStatus,
    source,
  })

  if (bulkStatus.status === 'completed') {
    for (const recipient of recipients.filter(
      (recipient) => recipient.status === 'pending',
    )) {
      await markRecipientSent({
        recipientId: recipient.id,
        providerMessageId: recipient.providerMessageId ?? bulkRequestId,
      })
    }

    await updateCampaign(campaign.id, {
      status: 'sent',
      errorMessage: null,
    })

    const emailChannel = campaign.channels.find(
      (channel) => channel.channel === 'email',
    )
    if (emailChannel) {
      await markCampaignChannelRecipientsSentByProviderRequest({
        campaignId: campaign.id,
        providerRequestId: bulkRequestId,
      })
      await updateCampaignChannelStatus({
        campaignChannelId: emailChannel.id,
        status: 'sent',
        errorMessage: null,
      })
    }
  }

  if (bulkStatus.status === 'failed') {
    const errorMessage = 'La requête Bulk Postmark a échoué.'

    for (const recipient of recipients.filter(
      (recipient) => recipient.status === 'pending',
    )) {
      await markRecipientFailed({
        recipientId: recipient.id,
        errorMessage,
      })
    }

    await updateCampaign(campaign.id, {
      status: 'failed',
      errorMessage,
    })

    const emailChannel = campaign.channels.find(
      (channel) => channel.channel === 'email',
    )
    if (emailChannel) {
      await markCampaignChannelRecipientsFailedByProviderRequest({
        campaignId: campaign.id,
        providerRequestId: bulkRequestId,
        errorMessage,
      })
      await updateCampaignChannelStatus({
        campaignChannelId: emailChannel.id,
        status: 'failed',
        errorMessage,
      })
    }
  }

  return {
    bulkStatus,
    campaign: (await findCampaignById(campaign.id)) ?? campaign,
    stats: await getCampaignStats(campaign.id),
  }
}

function isPostmarkModeEnabled(mode: 'single' | 'bulk') {
  const key =
    mode === 'bulk' ? 'POSTMARK_BULK_ENABLED' : 'POSTMARK_SINGLE_ENABLED'
  const value = getMailSetting(key)

  return value !== 'false' && value !== '0' && value !== 'off'
}

function getChannelRecipientId(recipient: unknown) {
  const value =
    recipient && typeof recipient === 'object'
      ? (recipient as { channelRecipientId?: unknown }).channelRecipientId
      : undefined

  return typeof value === 'number'
    ? value
    : null
}

function buildCommunicationHeaders(provider: CommunicationProvider) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const authHeader = getProviderVariable(provider, 'auth_header')
  const apiKey = getProviderVariable(provider, 'api_key')
  const bearerToken = getProviderVariable(provider, 'bearer_token')

  if (authHeader) {
    headers.Authorization = authHeader
  } else if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  return headers
}

function getRecipientValue(
  provider: CommunicationProvider,
  recipient: CampaignChannelRecipient,
) {
  const variables = getTemplateVariables(recipient.contact)
  const configuredValue =
    getProviderVariable(provider, 'recipient') ??
    getProviderVariable(provider, 'to') ??
    getProviderVariable(provider, 'chat_id')

  if (configuredValue) {
    return renderStringTemplate(configuredValue, variables)
  }

  return recipient.contact.mobileNumber ?? recipient.contact.email
}

function getProviderVariable(
  provider: CommunicationProvider,
  key: string,
): string | undefined {
  const value = provider.variables.find((variable) => variable.key === key)?.value

  return value && value.trim().length > 0 ? value.trim() : undefined
}

function normalizeMessageText(content: string) {
  return content
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function renderStringTemplate(
  content: string,
  variables: Record<string, string | number>,
) {
  return Object.entries(variables).reduce(
    (current, [key, value]) =>
      current.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value)),
    content,
  )
}

function parseProviderResponse(text: string) {
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function parseJsonPayload(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error('payload_json doit être un JSON valide après remplacement des variables.')
  }
}

function extractProviderMessageId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined

  const record = response as Record<string, unknown>
  const messageId =
    record.message_id ??
    record.messageId ??
    record.id ??
    (Array.isArray(record.messages) && record.messages[0]
      ? (record.messages[0] as Record<string, unknown>).id
      : undefined) ??
    (record.result && typeof record.result === 'object'
      ? (record.result as Record<string, unknown>).message_id
      : undefined)

  return messageId ? String(messageId) : undefined
}

function extractCommunicationProviderMessageId(
  provider: CommunicationProvider,
  response: unknown,
) {
  if (isWassengerProvider(provider)) {
    return extractWassengerMessageId(response) ?? extractProviderMessageId(response)
  }

  return extractProviderMessageId(response)
}

async function waitForProviderRateLimit(provider: CommunicationProvider) {
  const maxPerMinute = Math.max(1, provider.limits.maxPerMinute)
  const delayMs = Math.ceil(60000 / maxPerMinute)

  if (delayMs <= 0) return

  await new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

function formatChannelLabel(channel: CampaignChannelConfig['channel']) {
  const labels: Record<CampaignChannelConfig['channel'], string> = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
  }

  return labels[channel]
}

function logCampaignPayload(input: {
  campaign: Campaign
  channel?: CampaignChannelConfig['channel']
  mode: 'bulk' | 'single'
  payload: unknown
  providerName: string
  recipientCount: number
  source: CampaignSendSource
}) {
  console.log(
    `[Campaigns][${input.source}] Sending ${input.channel ?? 'email'} ${input.mode} campaign ${input.campaign.id} with ${input.providerName} (${input.recipientCount} recipient(s))...`,
  )
  console.log(
    `[Campaigns][${input.source}] Payload: ${JSON.stringify(input.payload, null, 2)}`,
  )
  void createTechnicalLog({
    level: 'debug',
    scope: 'campaign_send',
    event: 'provider_payload',
    message: `Payload ${input.channel ?? 'email'} envoyé à ${input.providerName}.`,
    campaignId: input.campaign.id,
    provider: input.providerName,
    payload: input.payload,
  }).catch(() => undefined)
}

function logCampaignResponse(input: {
  campaign: Campaign
  channel?: CampaignChannelConfig['channel']
  mode: 'bulk' | 'single'
  response: unknown
  source: CampaignSendSource
}) {
  console.log(
    `[Campaigns][${input.source}] ${input.channel ?? 'email'} ${input.mode} campaign ${input.campaign.id} API response: ${JSON.stringify(input.response, null, 2)}`,
  )
  void createTechnicalLog({
    level: 'info',
    scope: 'campaign_send',
    event: 'provider_response',
    message: `Réponse provider pour la campagne ${input.campaign.id}.`,
    campaignId: input.campaign.id,
    response: input.response,
  }).catch(() => undefined)
}

function logCampaignError(input: {
  campaign: Campaign
  error: unknown
  message: string
  mode: 'bulk' | 'single'
  source: CampaignSendSource
}) {
  const providerResponse =
    input.error instanceof Error && 'response' in input.error
      ? (input.error as Error & { response?: unknown }).response
      : undefined

  console.error(
    `[Campaigns][${input.source}] ${input.mode} campaign ${input.campaign.id} API error: ${input.message}`,
  )

  if (providerResponse !== undefined) {
    console.error(
      `[Campaigns][${input.source}] Error response: ${JSON.stringify(providerResponse, null, 2)}`,
    )
  } else {
    console.error(`[Campaigns][${input.source}] Error details:`, input.error)
  }

  void createTechnicalLog({
    level: 'error',
    scope: 'campaign_send',
    event: 'provider_error',
    message: input.message,
    campaignId: input.campaign.id,
    error: input.error instanceof Error ? input.error.stack ?? input.error.message : String(input.error),
    response: providerResponse,
  }).catch(() => undefined)
}

function getTemplateVariables(contact: {
  id?: number
  email: string
  fullName: string | null
  mobileNumber: string | null
  commune: string | null
  country: string | null
  firstName: string | null
  lastName: string | null
}) {
  const fullName =
    contact.fullName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    ''
  const firstName = contact.firstName || fullName.split(' ')[0] || ''
  const lastName =
    contact.lastName ||
    fullName
      .split(' ')
      .slice(1)
      .join(' ') ||
    ''
  const unsubscribeToken = createUnsubscribeToken(contact.email)
  const unsubscribeUrl = `${env.appUrl.replace(/\/$/, '')}/unsubscribe/${unsubscribeToken}`

  return {
    email: contact.email,
    fullName,
    mobileNumber: contact.mobileNumber ?? '',
    commune: contact.commune ?? '',
    country: contact.country ?? '',
    firstName,
    lastName,
    unsubscribeUrl,
    contactId: contact.id ?? '',
    nomPrenoms: fullName,
    nomEtPrenoms: fullName,
    numeroMobile: contact.mobileNumber ?? '',
    telephone: contact.mobileNumber ?? '',
    pays: contact.country ?? '',
  }
}
