import { getMailSetting } from '../mail/mail-settings.service.js'
import { getMailProvider } from '../mail/providers/provider-registry.js'
import { findTemplateById } from '../templates/templates.repository.js'
import { renderTemplate } from '../templates/templates.renderer.js'
import type { Campaign } from './campaigns.types.js'
import {
  attachRecipientProviderMessage,
  findCampaignById,
  getCampaignStats,
  listCampaignRecipients,
  listPendingCampaignRecipients,
  markRecipientFailed,
  markRecipientSent,
  prepareCampaignRecipients,
  updateCampaign,
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

export async function sendCampaign(
  campaign: Campaign,
  source: CampaignSendSource = 'manual',
) {
  const template = await findTemplateById(campaign.templateId)

  if (!template) {
    throw new Error('Campaign template not found.')
  }

  await updateCampaignStatus(campaign.id, 'sending')

  const provider = await getMailProvider()
  let recipients = await listPendingCampaignRecipients(campaign.id)
  let sent = 0
  let failed = 0
  let bulkErrorMessage = ''
  const recipientErrors: string[] = []

  if (recipients.length === 0) {
    await prepareCampaignRecipients(campaign)
    recipients = await listPendingCampaignRecipients(campaign.id)
  }

  if (recipients.length === 0) {
    const errorMessage =
      'Aucun destinataire éligible à envoyer. Vérifiez que la liste contient des contacts actifs, non désabonnés et non supprimés.'

    await updateCampaign(campaign.id, {
      status: 'failed',
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

  const sendBulk = provider.sendBulk?.bind(provider)
  const canUseBulk = Boolean(sendBulk) && campaign.sendMode === 'bulk'

  if (campaign.sendMode === 'bulk' && !isPostmarkModeEnabled('bulk')) {
    throw new Error(
      'Le mode Bulk Postmark est désactivé. Activez-le dans Providers ou choisissez le mode classique.',
    )
  }

  if (campaign.sendMode === 'single' && !isPostmarkModeEnabled('single')) {
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
    const updatedCampaign = await findCampaignById(campaign.id)

    return {
      campaign: updatedCampaign ?? campaign,
      sent,
      failed,
      stats: await getCampaignStats(campaign.id),
    }
  }

  if (campaign.sendMode === 'bulk' && !provider.sendBulk) {
    throw new Error('Le provider actif ne supporte pas l’envoi Bulk.')
  }

  for (const recipient of recipients) {
    const rendered = renderTemplate(template, getTemplateVariables(recipient.contact))

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
        subject: campaign.subject || rendered.subject,
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
  const updatedCampaign = await findCampaignById(campaign.id)

  return {
    campaign: updatedCampaign ?? campaign,
    sent,
    failed,
    stats: await getCampaignStats(campaign.id),
  }
}

export async function syncCampaignBulkStatus(campaign: Campaign) {
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
    source: 'manual',
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

function logCampaignPayload(input: {
  campaign: Campaign
  mode: 'bulk' | 'single'
  payload: unknown
  providerName: string
  recipientCount: number
  source: CampaignSendSource
}) {
  console.log(
    `[Campaigns][${input.source}] Sending ${input.mode} campaign ${input.campaign.id} with ${input.providerName} (${input.recipientCount} recipient(s))...`,
  )
  console.log(
    `[Campaigns][${input.source}] Payload: ${JSON.stringify(input.payload, null, 2)}`,
  )
}

function logCampaignResponse(input: {
  campaign: Campaign
  mode: 'bulk' | 'single'
  response: unknown
  source: CampaignSendSource
}) {
  console.log(
    `[Campaigns][${input.source}] ${input.mode} campaign ${input.campaign.id} API response: ${JSON.stringify(input.response, null, 2)}`,
  )
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
    return
  }

  console.error(`[Campaigns][${input.source}] Error details:`, input.error)
}

function getTemplateVariables(contact: {
  email: string
  fullName: string | null
  mobileNumber: string | null
  commune: string | null
  country: string | null
  firstName: string | null
  lastName: string | null
}) {
  return {
    email: contact.email,
    fullName: contact.fullName,
    mobileNumber: contact.mobileNumber,
    commune: contact.commune,
    country: contact.country,
    firstName: contact.firstName,
    lastName: contact.lastName,
  }
}
