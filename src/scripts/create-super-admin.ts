import bcrypt from 'bcryptjs'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'
import { fullPermissions } from '../modules/auth/auth.service.js'

type RoleRow = RowDataPacket & {
  id: number
}

type UserRow = RowDataPacket & {
  id: number
}

type SuperAdminRow = RowDataPacket & {
  id: number
  email: string
}

type CountRow = RowDataPacket & {
  total: number
}

function readArg(name: string) {
  const prefixed = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefixed))

  if (inline) {
    return inline.slice(prefixed.length)
  }

  const index = process.argv.indexOf(`--${name}`)

  if (index >= 0) {
    return process.argv[index + 1]
  }

  return undefined
}

async function tableExists(tableName: string) {
  const [rows] = await db.execute<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName],
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await db.execute<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function ensureUserSchema() {
  if (!(await tableExists('users'))) {
    await db.execute(`
      CREATE TABLE users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'super_admin') NOT NULL DEFAULT 'admin',
        role_id BIGINT UNSIGNED NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_users_role_id (role_id),
        KEY idx_users_active_role (is_active, role)
      )
    `)

    return
  }

  if (!(await columnExists('users', 'role_id'))) {
    await db.execute('ALTER TABLE users ADD COLUMN role_id BIGINT UNSIGNED NULL AFTER role')
    await db.execute('ALTER TABLE users ADD INDEX idx_users_role_id (role_id)')
  }

  if (!(await columnExists('users', 'is_active'))) {
    await db.execute('ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role_id')
    await db.execute('ALTER TABLE users ADD INDEX idx_users_active_role (is_active, role)')
  }

  await db.execute(
    "ALTER TABLE users MODIFY role ENUM('admin', 'super_admin') NOT NULL DEFAULT 'admin'",
  )
}

async function ensureAdminRolesSchema() {
  if (await tableExists('admin_roles')) {
    return
  }

  await db.execute(`
    CREATE TABLE admin_roles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      description TEXT NULL,
      permissions_json JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
}

async function ensureSuperAdminRole() {
  await ensureAdminRolesSchema()

  const [roles] = await db.execute<RoleRow[]>(
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
        JSON.stringify(fullPermissions),
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
      JSON.stringify(fullPermissions),
    ],
  )

  return result.insertId
}

async function listSuperAdmins() {
  const [rows] = await db.execute<SuperAdminRow[]>(
    "SELECT id, email FROM users WHERE role = 'super_admin' ORDER BY id ASC",
  )

  return rows
}

async function createSuperAdmin() {
  const shouldDelete = process.argv.includes('--delete')
  const name = readArg('name') ?? process.env.SUPER_ADMIN_NAME ?? 'Super Admin'
  const email =
    readArg('email') ?? process.env.SUPER_ADMIN_EMAIL ?? 'jo.djebi@gmail.com'
  const password = readArg('password') ?? process.env.SUPER_ADMIN_PASSWORD

  if (!password) {
    throw new Error(
      'Mot de passe manquant. Utilisez SUPER_ADMIN_PASSWORD ou --password=...',
    )
  }

  await ensureUserSchema()
  const existingSuperAdmins = await listSuperAdmins()
  const existingSameSuperAdmin = existingSuperAdmins.find(
    (superAdmin) => superAdmin.email.toLowerCase() === email.toLowerCase(),
  )
  const existingOtherSuperAdmin = existingSuperAdmins.find(
    (superAdmin) => superAdmin.email.toLowerCase() !== email.toLowerCase(),
  )

  if (existingSuperAdmins.length > 1) {
    throw new Error(
      'Plusieurs super admins existent déjà. Nettoyez la table users manuellement avant de relancer cette commande.',
    )
  }

  if (existingOtherSuperAdmin) {
    throw new Error(
      `Un super admin existe déjà (${existingOtherSuperAdmin.email}). Un seul super admin est autorisé.`,
    )
  }

  const roleId = await ensureSuperAdminRole()
  const passwordHash = await bcrypt.hash(password, 12)

  if (shouldDelete && existingSameSuperAdmin) {
    await db.execute('DELETE FROM users WHERE email = ?', [email])
  }

  const [users] = await db.execute<UserRow[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  )

  if (users[0]) {
  await db.execute(
    `UPDATE users
     SET name = ?, password_hash = ?, role = 'super_admin', role_id = ?, is_active = 1
     WHERE id = ?`,
      [name, passwordHash, roleId, users[0].id],
    )

    console.log(`Super admin mis à jour : ${email}`)
    return
  }

  await db.execute(
    `INSERT INTO users (name, email, password_hash, role, role_id)
     VALUES (?, ?, ?, 'super_admin', ?)`,
    [name, email, passwordHash, roleId],
  )

  console.log(`Super admin créé : ${email}`)
}

createSuperAdmin()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
