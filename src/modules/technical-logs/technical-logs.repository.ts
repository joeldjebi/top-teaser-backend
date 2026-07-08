import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type {
  CreateTechnicalLogInput,
  TechnicalLog,
  TechnicalLogLevel,
} from './technical-logs.types.js'

type TechnicalLogRow = RowDataPacket & {
  id: number
  level: TechnicalLogLevel
  scope: string
  event: string
  message: string
  campaign_id: number | null
  campaign_channel_id: number | null
  provider: string | null
  payload_json: string | null
  response_json: string | null
  error_message: string | null
  created_at: Date
}

function parseJson(value: string | null) {
  if (!value) return null

  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function serializeJson(value: unknown) {
  if (value === undefined) return null

  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ unserializable: true })
  }
}

function mapTechnicalLog(row: TechnicalLogRow): TechnicalLog {
  return {
    id: row.id,
    level: row.level,
    scope: row.scope,
    event: row.event,
    message: row.message,
    campaignId: row.campaign_id,
    campaignChannelId: row.campaign_channel_id,
    provider: row.provider,
    payload: parseJson(row.payload_json),
    response: parseJson(row.response_json),
    error: row.error_message,
    createdAt: row.created_at.toISOString(),
  }
}

export async function createTechnicalLog(input: CreateTechnicalLogInput) {
  await db.execute<ResultSetHeader>(
    `INSERT INTO technical_logs
       (level, scope, event, message, campaign_id, campaign_channel_id,
        provider, payload_json, response_json, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.level ?? 'info',
      input.scope,
      input.event,
      input.message,
      input.campaignId ?? null,
      input.campaignChannelId ?? null,
      input.provider ?? null,
      serializeJson(input.payload),
      serializeJson(input.response),
      input.error ?? null,
    ],
  )
}

export async function listTechnicalLogs(limit = 300): Promise<TechnicalLog[]> {
  const normalizedLimit = Math.min(Math.max(limit, 1), 1000)
  const [rows] = await db.execute<TechnicalLogRow[]>(
    `SELECT id, level, scope, event, message, campaign_id,
            campaign_channel_id, provider, payload_json, response_json,
            error_message, created_at
     FROM technical_logs
     ORDER BY created_at DESC, id DESC
     LIMIT ${normalizedLimit}`,
  )

  return rows.map(mapTechnicalLog)
}
