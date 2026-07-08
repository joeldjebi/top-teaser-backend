import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { ContactStatus } from '../contacts/contacts.types.js'
import type {
  Campaign,
  CampaignChannelConfig,
  CampaignChannelRecipient,
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
  channel: Campaign['channel']
  communication_provider_id: number | null
  send_mode: Campaign['sendMode']
  status: CampaignStatus
  error_message: string | null
  scheduled_at: Date | null
  sent_at: Date | null
  recipients_count: number
  created_at: Date
  updated_at: Date
}

type CampaignChannelRow = RowDataPacket & {
  id: number
  campaign_id: number
  channel: CampaignChannelConfig['channel']
  communication_provider_id: number | null
  send_mode: CampaignChannelConfig['sendMode']
  status: CampaignStatus
  error_message: string | null
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

type CampaignChannelRecipientRow = CampaignRecipientRow & {
  channel_recipient_id: number
  campaign_channel_id: number
}

type StatsRow = RowDataPacket & {
  status: CampaignRecipientStatus
  total: number
}

type ChannelStatusRow = RowDataPacket & {
  id: number
  channel: CampaignChannelConfig['channel']
  provider_name: string | null
  status: CampaignStatus
  error_message: string | null
  pending: number
  sent: number
  failed: number
  bounced: number
  opened: number
  clicked: number
  unsubscribed: number
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
    channel: row.channel ?? 'email',
    communicationProviderId: row.communication_provider_id,
    sendMode: row.send_mode ?? 'single',
    channels: [],
    status: row.status,
    errorMessage: row.error_message,
    scheduledAt: toIsoDate(row.scheduled_at),
    sentAt: toIsoDate(row.sent_at),
    recipientsCount: Number(row.recipients_count),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapCampaignChannel(row: CampaignChannelRow): CampaignChannelConfig {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    channel: row.channel,
    communicationProviderId: row.communication_provider_id,
    sendMode: row.send_mode ?? 'single',
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function getPrimaryChannelInput(input: CreateCampaignInput | UpdateCampaignInput) {
  const channels = input.channels ?? []
  const emailChannel = channels.find((channel) => channel.channel === 'email')
  const primaryChannel = emailChannel ?? channels[0]

  return {
    channel: primaryChannel?.channel ?? input.channel ?? 'email',
    communicationProviderId:
      primaryChannel?.communicationProviderId ?? input.communicationProviderId ?? null,
    sendMode: primaryChannel?.sendMode ?? input.sendMode ?? 'single',
  }
}

async function hydrateCampaignChannels(campaign: Campaign): Promise<Campaign> {
  const channels = await listCampaignChannels(campaign.id)

  return {
    ...campaign,
    channels:
      channels.length > 0
        ? channels
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
          ],
  }
}

export async function listCampaignChannels(
  campaignId: number,
): Promise<CampaignChannelConfig[]> {
  const [rows] = await db.execute<CampaignChannelRow[]>(
    `SELECT id, campaign_id, channel, communication_provider_id, send_mode,
            status, error_message, created_at, updated_at
     FROM campaign_channels
     WHERE campaign_id = ?
     ORDER BY FIELD(channel, 'email', 'sms', 'whatsapp', 'telegram'), id ASC`,
    [campaignId],
  )

  return rows.map(mapCampaignChannel)
}

async function replaceCampaignChannels(
  campaignId: number,
  input: CreateCampaignInput | UpdateCampaignInput,
) {
  if (input.channels === undefined) return

  await db.execute('DELETE FROM campaign_channels WHERE campaign_id = ?', [
    campaignId,
  ])

  for (const channel of input.channels) {
    await db.execute(
      `INSERT INTO campaign_channels
         (campaign_id, channel, communication_provider_id, send_mode, status)
       VALUES (?, ?, ?, ?, 'ready')`,
      [
        campaignId,
        channel.channel,
        channel.communicationProviderId ?? null,
        channel.sendMode ?? 'single',
      ],
    )
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

function mapCampaignChannelRecipient(
  row: CampaignChannelRecipientRow,
): CampaignChannelRecipient {
  return {
    ...mapCampaignRecipient(row),
    channelRecipientId: row.channel_recipient_id,
    campaignChannelId: row.campaign_channel_id,
  }
}

export async function listCampaigns(): Promise<Campaign[]> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id,
            c.channel, c.communication_provider_id, c.status, c.send_mode,
            c.error_message, c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC, c.id DESC`,
  )

  return Promise.all(rows.map((row) => hydrateCampaignChannels(mapCampaign(row))))
}

export async function findCampaignById(id: number): Promise<Campaign | null> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id,
            c.channel, c.communication_provider_id, c.status, c.send_mode,
            c.error_message, c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     WHERE c.id = ?
     GROUP BY c.id
     LIMIT 1`,
    [id],
  )

  const campaign = rows[0]

  return campaign ? hydrateCampaignChannels(mapCampaign(campaign)) : null
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<Campaign> {
  const primaryChannel = getPrimaryChannelInput(input)
  const channels = input.channels ?? [primaryChannel]

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO campaigns
       (name, subject, template_id, contact_list_id, channel, communication_provider_id, send_mode, status, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.subject,
      input.templateId,
      input.contactListId,
      primaryChannel.channel,
      primaryChannel.communicationProviderId,
      primaryChannel.sendMode,
      'ready',
      formatDateForMysql(input.scheduledAt),
    ],
  )

  await replaceCampaignChannels(result.insertId, {
    ...input,
    channels,
  })

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
  const primaryChannel =
    input.channels !== undefined ? getPrimaryChannelInput(input) : null

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

  if (primaryChannel || input.channel !== undefined) {
    fields.push('channel = ?')
    values.push(primaryChannel?.channel ?? input.channel ?? 'email')
  }

  if (primaryChannel || input.communicationProviderId !== undefined) {
    fields.push('communication_provider_id = ?')
    values.push(
      primaryChannel?.communicationProviderId ?? input.communicationProviderId ?? null,
    )
  }

  if (primaryChannel || input.sendMode !== undefined) {
    fields.push('send_mode = ?')
    values.push(primaryChannel?.sendMode ?? input.sendMode ?? 'single')
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

  await replaceCampaignChannels(id, input)

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

export async function prepareCampaignChannelRecipients(input: {
  campaignId: number
  campaignChannelId: number
}): Promise<number> {
  await db.execute(
    'DELETE FROM campaign_channel_recipients WHERE campaign_channel_id = ?',
    [input.campaignChannelId],
  )

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO campaign_channel_recipients
       (campaign_channel_id, campaign_recipient_id, contact_id)
     SELECT ?, cr.id, cr.contact_id
     FROM campaign_recipients cr
     WHERE cr.campaign_id = ?`,
    [input.campaignChannelId, input.campaignId],
  )

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

export async function listPendingCampaignChannelRecipients(
  campaignChannelId: number,
): Promise<CampaignChannelRecipient[]> {
  const [rows] = await db.execute<CampaignChannelRecipientRow[]>(
    `SELECT ccr.id AS channel_recipient_id, ccr.campaign_channel_id,
            cr.id, cr.campaign_id, cr.contact_id,
            ccr.provider_message_id, ccr.status, ccr.error_message,
            ccr.sent_at, ccr.created_at, ccr.updated_at,
            c.email, c.full_name, c.mobile_number, c.commune, c.country,
            c.first_name, c.last_name, c.status AS contact_status,
            c.unsubscribed_at, c.created_at AS contact_created_at,
            c.updated_at AS contact_updated_at
     FROM campaign_channel_recipients ccr
     INNER JOIN campaign_recipients cr ON cr.id = ccr.campaign_recipient_id
     INNER JOIN contacts c ON c.id = ccr.contact_id
     WHERE ccr.campaign_channel_id = ? AND ccr.status = 'pending'
     ORDER BY ccr.created_at ASC, ccr.id ASC`,
    [campaignChannelId],
  )

  return rows.map(mapCampaignChannelRecipient)
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

export async function markCampaignChannelRecipientSent(input: {
  channelRecipientId: number
  providerMessageId?: string
}) {
  await db.execute(
    `UPDATE campaign_channel_recipients
     SET status = 'sent', provider_message_id = ?, error_message = NULL, sent_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [input.providerMessageId ?? null, input.channelRecipientId],
  )
}

export async function attachCampaignChannelRecipientProviderMessage(input: {
  channelRecipientId: number
  providerMessageId: string
}) {
  await db.execute(
    `UPDATE campaign_channel_recipients
     SET provider_message_id = ?, error_message = NULL
     WHERE id = ?`,
    [input.providerMessageId, input.channelRecipientId],
  )
}

export async function markCampaignChannelRecipientFailed(input: {
  channelRecipientId: number
  errorMessage: string
}) {
  await db.execute(
    `UPDATE campaign_channel_recipients
     SET status = 'failed', error_message = ?
     WHERE id = ?`,
    [input.errorMessage, input.channelRecipientId],
  )
}

export async function markCampaignChannelRecipientsSentByProviderRequest(input: {
  campaignId: number
  providerRequestId: string
}) {
  await db.execute(
    `UPDATE campaign_channel_recipients ccr
     INNER JOIN campaign_channels cc ON cc.id = ccr.campaign_channel_id
     SET ccr.status = 'sent', ccr.error_message = NULL, ccr.sent_at = CURRENT_TIMESTAMP
     WHERE cc.campaign_id = ?
       AND ccr.status = 'pending'
       AND ccr.provider_message_id LIKE ?`,
    [input.campaignId, `${input.providerRequestId}:%`],
  )
}

export async function markCampaignChannelRecipientsFailedByProviderRequest(input: {
  campaignId: number
  providerRequestId: string
  errorMessage: string
}) {
  await db.execute(
    `UPDATE campaign_channel_recipients ccr
     INNER JOIN campaign_channels cc ON cc.id = ccr.campaign_channel_id
     SET ccr.status = 'failed', ccr.error_message = ?
     WHERE cc.campaign_id = ?
       AND ccr.status = 'pending'
       AND ccr.provider_message_id LIKE ?`,
    [input.errorMessage, input.campaignId, `${input.providerRequestId}:%`],
  )
}

export async function updateCampaignChannelStatus(input: {
  campaignChannelId: number
  status: CampaignStatus
  errorMessage?: string | null
}) {
  await db.execute(
    `UPDATE campaign_channels
     SET status = ?,
         error_message = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [input.status, input.errorMessage ?? null, input.campaignChannelId],
  )
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

export async function getCampaignChannelStatuses(campaignId: number) {
  const [rows] = await db.execute<ChannelStatusRow[]>(
    `SELECT cc.id, cc.channel, cp.name AS provider_name, cc.status,
            cc.error_message,
            SUM(CASE WHEN ccr.status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN ccr.status = 'sent' THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN ccr.status = 'failed' THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN ccr.status = 'bounced' THEN 1 ELSE 0 END) AS bounced,
            SUM(CASE WHEN ccr.status = 'opened' THEN 1 ELSE 0 END) AS opened,
            SUM(CASE WHEN ccr.status = 'clicked' THEN 1 ELSE 0 END) AS clicked,
            SUM(CASE WHEN ccr.status = 'unsubscribed' THEN 1 ELSE 0 END) AS unsubscribed
     FROM campaign_channels cc
     LEFT JOIN communication_providers cp ON cp.id = cc.communication_provider_id
     LEFT JOIN campaign_channel_recipients ccr ON ccr.campaign_channel_id = cc.id
     WHERE cc.campaign_id = ?
     GROUP BY cc.id
     ORDER BY FIELD(cc.channel, 'email', 'sms', 'whatsapp', 'telegram')`,
    [campaignId],
  )

  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    providerName: row.provider_name,
    status: row.status,
    errorMessage: row.error_message,
    stats: {
      pending: Number(row.pending ?? 0),
      sent: Number(row.sent ?? 0),
      failed: Number(row.failed ?? 0),
      bounced: Number(row.bounced ?? 0),
      opened: Number(row.opened ?? 0),
      clicked: Number(row.clicked ?? 0),
      unsubscribed: Number(row.unsubscribed ?? 0),
    },
  }))
}

export async function listScheduledCampaignsDueNow(): Promise<Campaign[]> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id, c.status,
            c.channel, c.communication_provider_id, c.send_mode, c.error_message,
            c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     WHERE c.status = 'ready'
       AND c.scheduled_at IS NOT NULL
       AND c.scheduled_at <= UTC_TIMESTAMP()
     GROUP BY c.id
     ORDER BY c.scheduled_at ASC`,
  )

  return Promise.all(rows.map((row) => hydrateCampaignChannels(mapCampaign(row))))
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

export async function listCampaignsAwaitingBulkStatus(): Promise<Campaign[]> {
  const [rows] = await db.execute<CampaignRow[]>(
    `SELECT c.id, c.name, c.subject, c.template_id, c.contact_list_id,
            c.channel, c.communication_provider_id, c.status, c.send_mode,
            c.error_message, c.scheduled_at, c.sent_at, c.created_at, c.updated_at,
            COUNT(cr.id) AS recipients_count
     FROM campaigns c
     LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
     WHERE c.status = 'sending'
       AND c.send_mode = 'bulk'
     GROUP BY c.id
     ORDER BY c.updated_at ASC, c.id ASC`,
  )

  return Promise.all(rows.map((row) => hydrateCampaignChannels(mapCampaign(row))))
}
