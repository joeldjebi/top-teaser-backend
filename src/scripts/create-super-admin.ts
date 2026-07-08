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

async function ensureSuperAdminRole() {
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

  const roleId = await ensureSuperAdminRole()
  const passwordHash = await bcrypt.hash(password, 12)

  if (shouldDelete) {
    await db.execute('DELETE FROM users WHERE email = ?', [email])
  }

  const [users] = await db.execute<UserRow[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  )

  if (users[0]) {
    await db.execute(
      `UPDATE users
       SET name = ?, password_hash = ?, role = 'super_admin', role_id = ?
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
