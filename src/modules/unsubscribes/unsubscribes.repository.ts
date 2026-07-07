import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'

export type SuppressionReason = 'unsubscribed' | 'bounce' | 'complaint' | 'manual'

export type Suppression = {
  id: number
  email: string
  reason: SuppressionReason
  createdAt: string
}

type SuppressionRow = RowDataPacket & {
  id: number
  email: string
  reason: SuppressionReason
  created_at: Date
}

function mapSuppression(row: SuppressionRow): Suppression {
  return {
    id: row.id,
    email: row.email,
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  }
}

export async function unsubscribeEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  await db.execute(
    `INSERT INTO suppression_list (email, reason)
     VALUES (?, 'unsubscribed')
     ON DUPLICATE KEY UPDATE reason = 'unsubscribed'`,
    [normalizedEmail],
  )

  await db.execute(
    `UPDATE contacts
     SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP
     WHERE email = ?`,
    [normalizedEmail],
  )
}

export async function listSuppressions(): Promise<Suppression[]> {
  const [rows] = await db.execute<SuppressionRow[]>(
    `SELECT id, email, reason, created_at
     FROM suppression_list
     ORDER BY created_at DESC, id DESC`,
  )

  return rows.map(mapSuppression)
}

export async function createSuppression(input: {
  email: string
  reason: SuppressionReason
}): Promise<Suppression> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO suppression_list (email, reason)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
    [input.email.trim().toLowerCase(), input.reason],
  )

  const suppression = await findSuppressionByEmail(input.email)

  if (!suppression && result.insertId) {
    throw new Error('Suppression was created but could not be loaded.')
  }

  return suppression as Suppression
}

export async function findSuppressionByEmail(
  email: string,
): Promise<Suppression | null> {
  const [rows] = await db.execute<SuppressionRow[]>(
    `SELECT id, email, reason, created_at
     FROM suppression_list
     WHERE email = ?
     LIMIT 1`,
    [email.trim().toLowerCase()],
  )

  const suppression = rows[0]

  return suppression ? mapSuppression(suppression) : null
}

export async function deleteSuppression(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM suppression_list WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}
