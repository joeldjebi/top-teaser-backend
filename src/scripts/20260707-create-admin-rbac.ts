import type { RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'
import { fullPermissions } from '../modules/auth/auth.service.js'

type Row = RowDataPacket & {
  total: number
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await db.execute<Row[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function tableExists(tableName: string) {
  const [rows] = await db.execute<Row[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName],
  )

  return Number(rows[0]?.total ?? 0) > 0
}

async function main() {
  if (!(await tableExists('admin_roles'))) {
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

  if (!(await columnExists('users', 'role_id'))) {
    await db.execute('ALTER TABLE users ADD COLUMN role_id BIGINT UNSIGNED NULL AFTER role')
    await db.execute('ALTER TABLE users ADD INDEX idx_users_role_id (role_id)')
  }

  await db.execute(
    "ALTER TABLE users MODIFY role ENUM('admin', 'super_admin') NOT NULL DEFAULT 'admin'",
  )

  const [roleRows] = await db.execute<Row[]>(
    'SELECT COUNT(*) AS total FROM admin_roles',
  )

  if (Number(roleRows[0]?.total ?? 0) === 0) {
    await db.execute(
      `INSERT INTO admin_roles (name, description, permissions_json)
       VALUES (?, ?, ?)`,
      [
        'Administrateur complet',
        'Accès complet à tous les modules.',
        JSON.stringify(fullPermissions),
      ],
    )
  }

  await db.execute(
    "UPDATE users SET role = 'super_admin' WHERE email = 'jo.djebi@gmail.com'",
  )

  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exit(1)
})
