import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { ContactStatus } from '../contacts/contacts.types.js'
import type {
  Campaign,
  CampaignRecipient,
  CampaignRecipientStatus,
  CampaignStats,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from './campaigns.types.js'

type CampaignRow = RowDataPacket & {
  id: number
  name: string
  subject: string
  template_id: number
  contact_list_id: number
  send_mode: Campaign['sendMode']
  status: CampaignStatus
  error_message: string | null
  scheduled_at: Date | null
  sent_at: Date | null
  recipients_count: number
  created_at: Date
  updated_at: Date
}

type CampaignRecipientRow = RowDataPacket & {
  id: number
  campaign_id: number
  contact_id: number
  provider_message_id: string | null
  status: CampaignRecipientStatus
  error_message: string | null
  sent_at: Date | null
  created_at: Date
  updated_at: Date
  email: string
  full_name: string | null
  mobile_number: string | null
  commune: string | null
  country: string | null
  first_name: string | null
  last_name: string | null
  contact_status: ContactStatus
  unsubscribed_at: Date | null
  contact_created_at: Date
  contact_updated_at: Date
}

type StatsRow = RowDataPacket & {
  status: CampaignRecipientStatus
  total: number
}

function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function formatDateForMysql(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    templateId: row.template_id,
    contactListId: row.contact_list_id,
    sendMode: row.send_mode ?? 'single',
    status: row.status,
    errorMessage: row.error_message,
    scheduledAt: toIsoDate(row.scheduled_at),
    sentAt: toIsoDate(row.sent_at),
    recipientsCount: Number(row.recipients_count),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapCampaignRecipient(row: CampaignRecipientRow): CampaignRecipient {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    contactId: row.contact_id,
    providerMessageId: row.provider_message_id,
    status: row.status,
    errorMessage: row.error_message,
    sentAt: toIsoDate(row.sent_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    contact: {
      id: row.contact_id,
      email: row.email,
      fullName: row.full_name,
      mobileNumber: row.mobile_number,
      commune: row.commune,
      country: row.country,
      firstName: row.first_name,
      lastName: row.last_name,
      status: row.contact_status,
      unsubscribedAt: toIsoDate(row.unsubscribed_at),
      createdAt: row.contact_created_at.toISOString(),
      updatedAt: row.contact_updated_at.toISOString(),
    },
  }
}

export async function listCampaigns(): Promise<Campaign[]> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id, c.status,
            c.send_mode, c.error_message, c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC, c.id DESC`,
  )

  return rows.map(mapCampaign)
}

export async function findCampaignById(id: number): Promise<Campaign | null> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id, c.status,
            c.send_mode, c.error_message, c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     WHERE c.id = ?
     GROUP BY c.id
     LIMIT 1`,
    [id],
  )

  const campaign = rows[0]

  return campaign ? mapCampaign(campaign) : null
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<Campaign> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO campaigns (name, subject, template_id, contact_list_id, send_mode, status, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.subject,
      input.templateId,
      input.contactListId,
      input.sendMode ?? 'single',
      'ready',
      formatDateForMysql(input.scheduledAt),
    ],
  )

  const campaign = await findCampaignById(result.insertId)

  if (!campaign) {
    throw new Error('Campaign was created but could not be loaded.')
  }

  return campaign
}

export async function updateCampaign(
  id: number,
  input: UpdateCampaignInput,
): Promise<Campaign | null> {
  const fields: string[] = []
  const values: Array<string | number | null> = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.subject !== undefined) {
    fields.push('subject = ?')
    values.push(input.subject)
  }

  if (input.templateId !== undefined) {
    fields.push('template_id = ?')
    values.push(input.templateId)
  }

  if (input.contactListId !== undefined) {
    fields.push('contact_list_id = ?')
    values.push(input.contactListId)
  }

  if (input.sendMode !== undefined) {
    fields.push('send_mode = ?')
    values.push(input.sendMode)
  }

  if (input.scheduledAt !== undefined) {
    fields.push('scheduled_at = ?')
    values.push(formatDateForMysql(input.scheduledAt))
  }

  if (input.status !== undefined) {
    fields.push('status = ?')
    values.push(input.status)
  }

  if (input.errorMessage !== undefined) {
    fields.push('error_message = ?')
    values.push(input.errorMessage)
  }

  if (fields.length > 0) {
    await db.execute(
      `UPDATE campaigns
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, id],
    )
  }

  return findCampaignById(id)
}

export async function deleteCampaign(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM campaigns WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}

export async function prepareCampaignRecipients(
  campaign: Campaign,
): Promise<number> {
  await db.execute('DELETE FROM campaign_recipients WHERE campaign_id = ?', [
    campaign.id,
  ])

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO campaign_recipients (campaign_id, contact_id)
     SELECT ?, c.id
     FROM contacts c
     INNER JOIN contact_list_items cli ON cli.contact_id = c.id
     LEFT JOIN suppression_list sl ON sl.email = c.email
     WHERE cli.contact_list_id = ?
       AND c.status = 'active'
       AND c.unsubscribed_at IS NULL
       AND sl.id IS NULL`,
    [campaign.id, campaign.contactListId],
  )

  await updateCampaign(campaign.id, { status: 'ready' })

  return result.affectedRows
}

export async function listCampaignRecipients(
  campaignId: number,
): Promise<CampaignRecipient[]> {
  const [rows] = await db.execute<CampaignRecipientRow[]>(
    `SELECT cr.id, cr.campaign_id, cr.contact_id, cr.provider_message_id,
            cr.status, cr.error_message, cr.sent_at, cr.created_at, cr.updated_at,
            c.email, c.full_name, c.mobile_number, c.commune, c.country,
            c.first_name, c.last_name, c.status AS contact_status,
            c.unsubscribed_at, c.created_at AS contact_created_at,
            c.updated_at AS contact_updated_at
     FROM campaign_recipients cr
     INNER JOIN contacts c ON c.id = cr.contact_id
     WHERE cr.campaign_id = ?
     ORDER BY cr.created_at ASC, cr.id ASC`,
    [campaignId],
  )

  return rows.map(mapCampaignRecipient)
}

export async function listPendingCampaignRecipients(
  campaignId: number,
): Promise<CampaignRecipient[]> {
  const [rows] = await db.execute<CampaignRecipientRow[]>(
    `SELECT cr.id, cr.campaign_id, cr.contact_id, cr.provider_message_id,
            cr.status, cr.error_message, cr.sent_at, cr.created_at, cr.updated_at,
            c.email, c.full_name, c.mobile_number, c.commune, c.country,
            c.first_name, c.last_name, c.status AS contact_status,
            c.unsubscribed_at, c.created_at AS contact_created_at,
            c.updated_at AS contact_updated_at
     FROM campaign_recipients cr
     INNER JOIN contacts c ON c.id = cr.contact_id
     WHERE cr.campaign_id = ? AND cr.status = 'pending'
     ORDER BY cr.created_at ASC, cr.id ASC`,
    [campaignId],
  )

  return rows.map(mapCampaignRecipient)
}

export async function markRecipientSent(input: {
  recipientId: number
  providerMessageId?: string
}) {
  await db.execute(
    `UPDATE campaign_recipients
     SET status = 'sent', provider_message_id = ?, error_message = NULL, sent_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [input.providerMessageId ?? null, input.recipientId],
  )
}

export async function attachRecipientProviderMessage(input: {
  recipientId: number
  providerMessageId: string
}) {
  await db.execute(
    `UPDATE campaign_recipients
     SET provider_message_id = ?, error_message = NULL
     WHERE id = ?`,
    [input.providerMessageId, input.recipientId],
  )
}

export async function markRecipientFailed(input: {
  recipientId: number
  errorMessage: string
}) {
  await db.execute(
    `UPDATE campaign_recipients
     SET status = 'failed', error_message = ?
     WHERE id = ?`,
    [input.errorMessage, input.recipientId],
  )
}

export async function updateCampaignStatus(
  id: number,
  status: CampaignStatus,
) {
  await db.execute(
    `UPDATE campaigns
     SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END
     WHERE id = ?`,
    [status, status, id],
  )
}

export async function getCampaignStats(
  campaignId: number,
): Promise<CampaignStats> {
  const stats: CampaignStats = {
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    bounced: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
  }

  const [rows] = await db.execute<StatsRow[]>(
    `SELECT status, COUNT(*) AS total
     FROM campaign_recipients
     WHERE campaign_id = ?
     GROUP BY status`,
    [campaignId],
  )

  for (const row of rows) {
    stats[row.status] = Number(row.total)
    stats.total += Number(row.total)
  }

  return stats
}

export async function listScheduledCampaignsDueNow(): Promise<Campaign[]> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id, c.status,
            c.send_mode, c.error_message, c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     WHERE c.status = 'ready'
       AND c.scheduled_at IS NOT NULL
       AND c.scheduled_at <= UTC_TIMESTAMP()
     GROUP BY c.id
     ORDER BY c.scheduled_at ASC`,
  )

  return rows.map(mapCampaign)
}

export async function getNextScheduledCampaignTime(): Promise<Date | null> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT scheduled_at FROM campaigns 
     WHERE status = 'ready' 
       AND scheduled_at IS NOT NULL 
       AND scheduled_at > UTC_TIMESTAMP()
     ORDER BY scheduled_at ASC
     LIMIT 1`,
  )

  if (rows.length > 0) {
    const row = rows[0] as { scheduled_at: Date }
    return new Date(row.scheduled_at)
  }

  return null
}
