import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'

type AdminInvitationRow = RowDataPacket & {
  id: number
  user_id: number
  token_hash: string
  expires_at: Date
  accepted_at: Date | null
  created_at: Date
}

export type AdminInvitation = {
  id: number
  userId: number
  tokenHash: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

function mapInvitation(row: AdminInvitationRow): AdminInvitation {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at.toISOString(),
    acceptedAt: row.accepted_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  }
}

export async function createAdminInvitation(input: {
  userId: number
  tokenHash: string
}) {
  await db.execute(
    `UPDATE admin_invitations
     SET accepted_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND accepted_at IS NULL`,
    [input.userId],
  )

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO admin_invitations (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 DAY))`,
    [input.userId, input.tokenHash],
  )

  return findAdminInvitationById(result.insertId)
}

export async function findAdminInvitationById(id: number) {
  const [rows] = await db.execute<AdminInvitationRow[]>(
    `SELECT id, user_id, token_hash, expires_at, accepted_at, created_at
     FROM admin_invitations
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  return rows[0] ? mapInvitation(rows[0]) : null
}

export async function findValidAdminInvitationByTokenHash(tokenHash: string) {
  const [rows] = await db.execute<AdminInvitationRow[]>(
    `SELECT id, user_id, token_hash, expires_at, accepted_at, created_at
     FROM admin_invitations
     WHERE token_hash = ?
       AND accepted_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash],
  )

  return rows[0] ? mapInvitation(rows[0]) : null
}

export async function markAdminInvitationAccepted(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE admin_invitations
     SET accepted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND accepted_at IS NULL`,
    [id],
  )

  return result.affectedRows > 0
}
