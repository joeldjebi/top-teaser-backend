import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import { createTechnicalLog } from '../technical-logs/technical-logs.repository.js'

type RecipientRow = RowDataPacket & {
  id: number
}

type ChannelRecipientRow = RowDataPacket & {
  id: number
  campaign_channel_id: number
  campaign_id: number
}

export async function createEmailEvent(input: {
  provider: string
  providerMessageId?: string | null
  eventType: string
  payload: unknown
}) {
  const campaignRecipientId = input.providerMessageId
    ? await findRecipientIdByProviderMessageId(input.providerMessageId)
    : null

  await db.execute<ResultSetHeader>(
    `INSERT INTO email_events
       (campaign_recipient_id, provider, provider_message_id, event_type, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [
      campaignRecipientId,
      input.provider,
      input.providerMessageId ?? null,
      input.eventType,
      JSON.stringify(input.payload),
    ],
  )

  if (campaignRecipientId) {
    await updateRecipientFromEvent(campaignRecipientId, input.eventType)
  }

  if (input.providerMessageId) {
    await updateChannelRecipientFromEvent(
      input.providerMessageId,
      input.eventType,
    )
  }

  await createTechnicalLog({
    level: 'info',
    scope: 'webhook',
    event: input.eventType,
    message: `Webhook ${input.provider} reçu.`,
    provider: input.provider,
    payload: input.payload,
  })
}

async function findRecipientIdByProviderMessageId(
  providerMessageId: string,
): Promise<number | null> {
  const [rows] = await db.execute<RecipientRow[]>(
    `SELECT id
     FROM campaign_recipients
     WHERE provider_message_id = ?
     LIMIT 1`,
    [providerMessageId],
  )

  return rows[0]?.id ?? null
}

async function updateRecipientFromEvent(
  campaignRecipientId: number,
  eventType: string,
) {
  const normalizedEvent = eventType.toLowerCase()
  const status =
    normalizedEvent.includes('bounce') ? 'bounced'
    : normalizedEvent.includes('open') ? 'opened'
    : normalizedEvent.includes('click') ? 'clicked'
    : normalizedEvent.includes('unsubscribe') ? 'unsubscribed'
    : null

  if (!status) {
    return
  }

  await db.execute(
    `UPDATE campaign_recipients
     SET status = ?
     WHERE id = ?`,
    [status, campaignRecipientId],
  )
}

async function updateChannelRecipientFromEvent(
  providerMessageId: string,
  eventType: string,
) {
  const [rows] = await db.execute<ChannelRecipientRow[]>(
    `SELECT ccr.id, ccr.campaign_channel_id, cc.campaign_id
     FROM campaign_channel_recipients ccr
     INNER JOIN campaign_channels cc ON cc.id = ccr.campaign_channel_id
     WHERE ccr.provider_message_id = ?
        OR ccr.provider_message_id LIKE ?
     LIMIT 1`,
    [providerMessageId, `${providerMessageId}:%`],
  )

  const recipient = rows[0]
  const status = getStatusFromEvent(eventType)

  if (!recipient || !status) return

  await db.execute(
    `UPDATE campaign_channel_recipients
     SET status = ?
     WHERE id = ?`,
    [status, recipient.id],
  )

  await db.execute(
    `UPDATE campaign_channels
     SET status = CASE
       WHEN EXISTS (
         SELECT 1 FROM campaign_channel_recipients
         WHERE campaign_channel_id = ? AND status = 'pending'
       ) THEN 'sending'
       WHEN EXISTS (
         SELECT 1 FROM campaign_channel_recipients
         WHERE campaign_channel_id = ? AND status IN ('sent', 'opened', 'clicked')
       ) THEN 'sent'
       ELSE status
     END
     WHERE id = ?`,
    [
      recipient.campaign_channel_id,
      recipient.campaign_channel_id,
      recipient.campaign_channel_id,
    ],
  )
}

function getStatusFromEvent(eventType: string) {
  const normalizedEvent = eventType.toLowerCase()

  return normalizedEvent.includes('bounce') ? 'bounced'
    : normalizedEvent.includes('open') ? 'opened'
    : normalizedEvent.includes('click') ? 'clicked'
    : normalizedEvent.includes('unsubscribe') ? 'unsubscribed'
    : normalizedEvent.includes('fail') || normalizedEvent.includes('error') ? 'failed'
    : normalizedEvent.includes('delivered') || normalizedEvent.includes('sent') ? 'sent'
    : null
}
