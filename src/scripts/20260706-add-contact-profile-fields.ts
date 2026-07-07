import { db } from '../database/mysql.js'

const columns = [
  {
    name: 'full_name',
    definition: 'VARCHAR(190) NULL AFTER email',
  },
  {
    name: 'mobile_number',
    definition: 'VARCHAR(60) NULL AFTER full_name',
  },
  {
    name: 'commune',
    definition: 'VARCHAR(120) NULL AFTER mobile_number',
  },
  {
    name: 'country',
    definition: 'VARCHAR(120) NULL AFTER commune',
  },
]

async function columnExists(columnName: string) {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'contacts'
       AND COLUMN_NAME = ?`,
    [columnName],
  )

  return Array.isArray(rows) && rows.length > 0
}

async function addContactProfileFields() {
  for (const column of columns) {
    if (await columnExists(column.name)) {
      continue
    }

    await db.query(
      `ALTER TABLE contacts ADD COLUMN ${column.name} ${column.definition}`,
    )
  }

  await db.query(
    `UPDATE contacts
     SET full_name = NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), '')
     WHERE full_name IS NULL`,
  )

  console.log('Contact profile fields are ready.')
}

addContactProfileFields()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
