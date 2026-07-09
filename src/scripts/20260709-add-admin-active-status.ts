import { db } from '../database/mysql.js'

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  )

  return Array.isArray(rows) && rows.length > 0
}

async function indexExists(tableName: string, indexName: string) {
  const [rows] = await db.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName],
  )

  return Array.isArray(rows) && rows.length > 0
}

async function run() {
  if (!(await columnExists('users', 'is_active'))) {
    await db.execute(`
      ALTER TABLE users
      ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role_id
    `)
  }

  await db.execute('UPDATE users SET is_active = 1 WHERE is_active IS NULL')

  if (!(await indexExists('users', 'idx_users_active_role'))) {
    await db.execute(`
      ALTER TABLE users
      ADD INDEX idx_users_active_role (is_active, role)
    `)
  }

  console.log('Admin active status is ready.')
}

run()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
