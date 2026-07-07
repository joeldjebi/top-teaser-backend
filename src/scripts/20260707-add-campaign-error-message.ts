import type { RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await db.execute<ColumnRow[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  )

  return rows.length > 0
}

async function main() {
  const exists = await columnExists('campaigns', 'error_message')

  if (!exists) {
    console.log('Adding error_message column to campaigns table...')
    await db.execute(
      'ALTER TABLE campaigns ADD COLUMN error_message TEXT NULL AFTER status',
    )
    console.log('Successfully added error_message column to campaigns table')
  } else {
    console.log('error_message column already exists in campaigns table')
  }

  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exit(1)
})
