import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'

type ActivityLogRow = RowDataPacket & {
  id: number
  user_id: number | null
  actor_name: string | null
  actor_email: string | null
  action: string
  resource: string
  resource_id: string | null
  message: string
  metadata_json: string | Record<string, unknown> | null
  created_at: Date
}

export type ActivityLog = {
  id: number
  userId: number | null
  actorName: string | null
  actorEmail: string | null
  action: string
  resource: string
  resourceId: string | null
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type ActivityActor = Pick<AuthenticatedUser, 'id' | 'name' | 'email'>

function parseMetadata(value: ActivityLogRow['metadata_json']) {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as Record<string, unknown>
  }

  return value
}

function mapActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    message: row.message,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at.toISOString(),
  }
}

export async function listActivityLogs(limit = 250) {
  const normalizedLimit = Math.min(Math.max(limit, 1), 500)
  const [rows] = await db.execute<ActivityLogRow[]>(
    `SELECT id, user_id, actor_name, actor_email, action, resource, resource_id,
            message, metadata_json, created_at
     FROM activity_logs
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [normalizedLimit],
  )

  return rows.map(mapActivityLog)
}

export async function logActivity(input: {
  actor?: ActivityActor | null
  action: string
  resource: string
  resourceId?: string | number | null
  message: string
  metadata?: Record<string, unknown> | null
}) {
  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO activity_logs (
         user_id, actor_name, actor_email, action, resource, resource_id,
         message, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.actor?.id ?? null,
        input.actor?.name ?? null,
        input.actor?.email ?? null,
        input.action,
        input.resource,
        input.resourceId === undefined || input.resourceId === null
          ? null
          : String(input.resourceId),
        input.message,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    )

    return result.insertId
  } catch (error) {
    console.warn('[ActivityLogs] Unable to write activity log:', error)
    return null
  }
}
