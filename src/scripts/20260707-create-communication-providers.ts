import type { RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'

type TableRow = RowDataPacket & {
  TABLE_NAME: string
}

async function tableExists(tableName: string) {
  const [rows] = await db.execute<TableRow[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  )

  return rows.length > 0
}

async function main() {
  const exists = await tableExists('communication_providers')

  if (exists) {
    console.log('communication_providers table already exists')
    await db.end()
    return
  }

  console.log('Creating communication_providers table...')
  await db.execute(`
    CREATE TABLE communication_providers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      channel ENUM('email', 'sms', 'whatsapp') NOT NULL,
      name VARCHAR(160) NOT NULL,
      provider_key VARCHAR(80) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 0,
      variables_json JSON NOT NULL,
      limits_json JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_communication_providers_channel_active (channel, is_active),
      KEY idx_communication_providers_key (provider_key)
    )
  `)
  console.log('communication_providers table created')

  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exit(1)
})
