import type { RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string
}

type IndexRow = RowDataPacket & {
  INDEX_NAME: string
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await db.execute<ColumnRow[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  )

  return rows.length > 0
}

async function indexExists(tableName: string, indexName: string) {
  const [rows] = await db.execute<IndexRow[]>(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName],
  )

  return rows.length > 0
}

async function main() {
  if (!(await columnExists('campaigns', 'channel'))) {
    console.log('Adding channel column to campaigns...')
    await db.execute(
      "ALTER TABLE campaigns ADD COLUMN channel ENUM('email', 'sms', 'whatsapp') NOT NULL DEFAULT 'email' AFTER contact_list_id",
    )
  }

  if (!(await columnExists('campaigns', 'communication_provider_id'))) {
    console.log('Adding communication_provider_id column to campaigns...')
    await db.execute(
      'ALTER TABLE campaigns ADD COLUMN communication_provider_id BIGINT UNSIGNED NULL AFTER channel',
    )
  }

  if (!(await indexExists('campaigns', 'idx_campaigns_channel_provider'))) {
    console.log('Adding idx_campaigns_channel_provider...')
    await db.execute(
      'ALTER TABLE campaigns ADD INDEX idx_campaigns_channel_provider (channel, communication_provider_id)',
    )
  }

  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exit(1)
})
