import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../database/mysql.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const schemaPath = resolve(currentDir, '../database/schema.sql')

async function initDatabase() {
  const schema = await readFile(schemaPath, 'utf8')
  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await db.query(statement)
  }

  console.log('Database schema initialized.')
}

initDatabase()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
