import type { RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { PermissionMatrix, UserWithPassword } from './auth.types.js'

type UserRow = RowDataPacket & {
  id: number
  name: string
  email: string
  password_hash: string
  role: 'admin' | 'super_admin'
  role_id: number | null
  role_name: string | null
  permissions_json: string | PermissionMatrix | null
}

function parsePermissions(value: string | PermissionMatrix | null): PermissionMatrix | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as PermissionMatrix
  }

  return value
}

export async function findUserByEmail(
  email: string,
): Promise<UserWithPassword | null> {
  const [rows] = await db.execute<UserRow[]>(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.role_id,
            ar.name AS role_name, ar.permissions_json
     FROM users u
     LEFT JOIN admin_roles ar ON ar.id = u.role_id
     WHERE u.email = ?
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
    roleId: user.role_id,
    roleName: user.role_name ?? (user.role === 'super_admin' ? 'Super admin' : 'Admin'),
    permissions: parsePermissions(user.permissions_json),
  }
}

export async function findUserById(id: number): Promise<UserWithPassword | null> {
  const [rows] = await db.execute<UserRow[]>(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.role_id,
            ar.name AS role_name, ar.permissions_json
     FROM users u
     LEFT JOIN admin_roles ar ON ar.id = u.role_id
     WHERE u.id = ?
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
    roleId: user.role_id,
    roleName: user.role_name ?? (user.role === 'super_admin' ? 'Super admin' : 'Admin'),
    permissions: parsePermissions(user.permissions_json),
  }
}
