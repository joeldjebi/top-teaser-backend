import bcrypt from 'bcryptjs'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { PermissionMatrix } from '../auth/auth.types.js'

type AdminRoleRow = RowDataPacket & {
  id: number
  name: string
  description: string | null
  permissions_json: string | PermissionMatrix
  created_at: Date
  updated_at: Date
}

type AdminUserRow = RowDataPacket & {
  id: number
  name: string
  email: string
  role: 'admin' | 'super_admin'
  role_id: number | null
  role_name: string | null
  permissions_json: string | PermissionMatrix | null
  created_at: Date
  updated_at: Date
}

export type AdminRole = {
  id: number
  name: string
  description: string | null
  permissions: PermissionMatrix
  createdAt: string
  updatedAt: string
}

export type AdminUser = {
  id: number
  name: string
  email: string
  role: 'admin' | 'super_admin'
  roleId: number | null
  roleName: string
  permissions: PermissionMatrix | null
  createdAt: string
  updatedAt: string
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

function mapRole(row: AdminRoleRow): AdminRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: parsePermissions(row.permissions_json) as PermissionMatrix,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roleId: row.role_id,
    roleName: row.role_name ?? (row.role === 'super_admin' ? 'Super admin' : 'Admin'),
    permissions: parsePermissions(row.permissions_json),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listAdminRoles() {
  const [rows] = await db.execute<AdminRoleRow[]>(
    `SELECT id, name, description, permissions_json, created_at, updated_at
     FROM admin_roles
     ORDER BY created_at DESC, id DESC`,
  )

  return rows.map(mapRole)
}

export async function findAdminRoleById(id: number) {
  const [rows] = await db.execute<AdminRoleRow[]>(
    `SELECT id, name, description, permissions_json, created_at, updated_at
     FROM admin_roles
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  return rows[0] ? mapRole(rows[0]) : null
}

export async function createAdminRole(input: {
  name: string
  description?: string | null
  permissions: PermissionMatrix
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO admin_roles (name, description, permissions_json)
     VALUES (?, ?, ?)`,
    [input.name, input.description ?? null, JSON.stringify(input.permissions)],
  )

  return findAdminRoleById(result.insertId)
}

export async function updateAdminRole(
  id: number,
  input: Partial<{ name: string; description: string | null; permissions: PermissionMatrix }>,
) {
  const fields: string[] = []
  const values: Array<string | null> = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.description !== undefined) {
    fields.push('description = ?')
    values.push(input.description)
  }

  if (input.permissions !== undefined) {
    fields.push('permissions_json = ?')
    values.push(JSON.stringify(input.permissions))
  }

  if (fields.length > 0) {
    await db.execute(`UPDATE admin_roles SET ${fields.join(', ')} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  return findAdminRoleById(id)
}

export async function deleteAdminRole(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM admin_roles WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}

export async function listAdminUsers() {
  const [rows] = await db.execute<AdminUserRow[]>(
    `SELECT u.id, u.name, u.email, u.role, u.role_id, u.created_at, u.updated_at,
            ar.name AS role_name, ar.permissions_json
     FROM users u
     LEFT JOIN admin_roles ar ON ar.id = u.role_id
     ORDER BY u.created_at DESC, u.id DESC`,
  )

  return rows.map(mapUser)
}

export async function findAdminUserById(id: number) {
  const [rows] = await db.execute<AdminUserRow[]>(
    `SELECT u.id, u.name, u.email, u.role, u.role_id, u.created_at, u.updated_at,
            ar.name AS role_name, ar.permissions_json
     FROM users u
     LEFT JOIN admin_roles ar ON ar.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [id],
  )

  return rows[0] ? mapUser(rows[0]) : null
}

export async function countSuperAdmins() {
  const [rows] = await db.execute<Array<RowDataPacket & { total: number }>>(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'super_admin'",
  )

  return Number(rows[0]?.total ?? 0)
}

async function findOrCreateSuperAdminRole(permissions: PermissionMatrix) {
  const [roles] = await db.execute<Array<RowDataPacket & { id: number }>>(
    `SELECT id
     FROM admin_roles
     WHERE name IN ('Super administrateur', 'Administrateur complet')
     ORDER BY FIELD(name, 'Super administrateur', 'Administrateur complet'), id
     LIMIT 1`,
  )

  if (roles[0]) {
    await db.execute(
      `UPDATE admin_roles
       SET name = ?, description = ?, permissions_json = ?
       WHERE id = ?`,
      [
        'Super administrateur',
        'Accès complet à tous les modules.',
        JSON.stringify(permissions),
        roles[0].id,
      ],
    )

    return roles[0].id
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO admin_roles (name, description, permissions_json)
     VALUES (?, ?, ?)`,
    [
      'Super administrateur',
      'Accès complet à tous les modules.',
      JSON.stringify(permissions),
    ],
  )

  return result.insertId
}

export async function createInitialSuperAdmin(input: {
  name: string
  email: string
  password: string
  permissions: PermissionMatrix
}) {
  if ((await countSuperAdmins()) > 0) {
    return null
  }

  const roleId = await findOrCreateSuperAdminRole(input.permissions)
  const passwordHash = await bcrypt.hash(input.password, 12)
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, role, role_id)
     VALUES (?, ?, ?, 'super_admin', ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = 'super_admin',
       role_id = VALUES(role_id)`,
    [input.name, input.email, passwordHash, roleId],
  )

  if (result.insertId > 0) {
    return findAdminUserById(result.insertId)
  }

  const [rows] = await db.execute<Array<RowDataPacket & { id: number }>>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [input.email],
  )

  return rows[0] ? findAdminUserById(rows[0].id) : null
}

export async function createAdminUser(input: {
  name: string
  email: string
  password: string
  roleId: number
}) {
  const passwordHash = await bcrypt.hash(input.password, 12)
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, role, role_id)
     VALUES (?, ?, ?, 'admin', ?)`,
    [input.name, input.email, passwordHash, input.roleId],
  )

  return findAdminUserById(result.insertId)
}

export async function updateAdminUser(
  id: number,
  input: Partial<{ name: string; email: string; roleId: number }>,
) {
  const fields: string[] = []
  const values: Array<string | number> = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.email !== undefined) {
    fields.push('email = ?')
    values.push(input.email)
  }

  if (input.roleId !== undefined) {
    fields.push('role_id = ?')
    values.push(input.roleId)
  }

  if (fields.length > 0) {
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  return findAdminUserById(id)
}

export async function updateAdminPassword(id: number, password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
    passwordHash,
    id,
  ])
}

export async function deleteAdminUser(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM users WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}
