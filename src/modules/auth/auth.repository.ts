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
}

type RoleRow = RowDataPacket & {
  name: string | null
  permissions_json: string | PermissionMatrix | null
}

type UserLookup = {
  id?: number
  email?: string
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

async function findRole(roleId: number | null) {
  if (!roleId) {
    return null
  }

  try {
    const [rows] = await db.execute<RoleRow[]>(
      `SELECT name, permissions_json
       FROM admin_roles
       WHERE id = ?
       LIMIT 1`,
      [roleId],
    )

    return rows[0] ?? null
  } catch (error) {
    console.warn('[Auth] Unable to load admin role:', error)
    return null
  }
}

async function findUser(where: UserLookup): Promise<UserWithPassword | null> {
  const isEmailLookup = where.email !== undefined
  const lookupValue = isEmailLookup ? where.email : where.id

  if (lookupValue === undefined) {
    return null
  }

  const [rows] = await db.execute<UserRow[]>(
    `SELECT id, name, email, password_hash, role, role_id
     FROM users
     WHERE ${isEmailLookup ? 'email' : 'id'} = ?
     LIMIT 1`,
    [lookupValue],
  )

  const user = rows[0]

  if (!user) {
    return null
  }

  const role = await findRole(user.role_id)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
    roleId: user.role_id,
    roleName: role?.name ?? (user.role === 'super_admin' ? 'Super admin' : 'Admin'),
    permissions: parsePermissions(role?.permissions_json ?? null),
  }
}

export async function findUserByEmail(
  email: string,
): Promise<UserWithPassword | null> {
  return findUser({ email })
}

export async function findUserById(id: number): Promise<UserWithPassword | null> {
  return findUser({ id })
}
