import type { RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { CampaignRecipientStatus } from '../campaigns/campaigns.types.js'
import type { EmailLog } from './email-logs.types.js'

type EmailLogRow = RowDataPacket & {
  id: number
  campaign_id: number
  campaign_name: string
  contact_id: number
  email: string
  provider_message_id: string | null
  status: CampaignRecipientStatus
  error_message: string | null
  sent_at: Date | null
  created_at: Date
  updated_at: Date
}

function toIsoDate(value: Date | null) {
  return value ? value.toISOString() : null
}

function mapEmailLog(row: EmailLogRow): EmailLog {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    contactId: row.contact_id,
    email: row.email,
    providerMessageId: row.provider_message_id,
    status: row.status,
    errorMessage: row.error_message,
    sentAt: toIsoDate(row.sent_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listEmailLogs(): Promise<EmailLog[]> {
  const [rows] = await db.execute<EmailLogRow[]>(
    `SELECT cr.id, cr.campaign_id, ca.name AS campaign_name, cr.contact_id,
            co.email, cr.provider_message_id, cr.status, cr.error_message,
            cr.sent_at, cr.created_at, cr.updated_at
     FROM campaign_recipients cr
     INNER JOIN campaigns ca ON ca.id = cr.campaign_id
     INNER JOIN contacts co ON co.id = cr.contact_id
     ORDER BY cr.created_at DESC, cr.id DESC`,
  )

  return rows.map(mapEmailLog)
}

export async function findEmailLogById(id: number): Promise<EmailLog | null> {
  const [rows] = await db.execute<EmailLogRow[]>(
    `SELECT cr.id, cr.campaign_id, ca.name AS campaign_name, cr.contact_id,
            co.email, cr.provider_message_id, cr.status, cr.error_message,
            cr.sent_at, cr.created_at, cr.updated_at
     FROM campaign_recipients cr
     INNER JOIN campaigns ca ON ca.id = cr.campaign_id
     INNER JOIN contacts co ON co.id = cr.contact_id
     WHERE cr.id = ?
     LIMIT 1`,
    [id],
  )

  const log = rows[0]

  return log ? mapEmailLog(log) : null
}
