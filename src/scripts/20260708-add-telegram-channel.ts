import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    ALTER TABLE communication_providers
    MODIFY channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL
  `)

  await db.execute(`
    ALTER TABLE campaigns
    MODIFY channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL DEFAULT 'email'
  `)

  console.log('Telegram channel ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
