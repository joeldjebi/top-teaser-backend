import type { RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'

type CountRow = RowDataPacket & {
  count: number
}

async function indexExists(indexName: string) {
  const [rows] = await db.execute<CountRow[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'contacts'
       AND index_name = ?`,
    [indexName],
  )

  return (rows[0]?.count ?? 0) > 0
}

async function main() {
  const exists = await indexExists('unique_contact_mobile_number')

  if (!exists) {
    await db.execute(
      'ALTER TABLE contacts ADD UNIQUE KEY unique_contact_mobile_number (mobile_number)',
    )
  }

  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exit(1)
})
