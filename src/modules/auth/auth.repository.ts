import type { RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { UserWithPassword } from './auth.types.js'

type UserRow = RowDataPacket & {
  id: number
  name: string
  email: string
  password_hash: string
  role: 'admin'
}

export async function findUserByEmail(
  email: string,
): Promise<UserWithPassword | null> {
  const [rows] = await db.execute<UserRow[]>(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  )

  const user = rows[0]

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
  }
}

export async function findUserById(id: number): Promise<UserWithPassword | null> {
  const [rows] = await db.execute<UserRow[]>(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  const user = rows[0]

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
  }
}
