import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'

type RecipientRow = RowDataPacket & {
  id: number
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
