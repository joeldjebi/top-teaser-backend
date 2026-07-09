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
  if (!(await columnExists('email_templates', 'channel'))) {
    await db.execute(`
      ALTER TABLE email_templates
      ADD COLUMN channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL DEFAULT 'email' AFTER id
    `)
  }

  if (!(await indexExists('email_templates', 'idx_email_templates_channel_created'))) {
    await db.execute(`
      ALTER TABLE email_templates
      ADD INDEX idx_email_templates_channel_created (channel, created_at, id)
    `)
  }

  if (!(await columnExists('campaign_channels', 'template_id'))) {
    await db.execute(`
      ALTER TABLE campaign_channels
      ADD COLUMN template_id BIGINT UNSIGNED NULL AFTER communication_provider_id
    `)
  }

  await db.execute(`
    UPDATE campaign_channels cc
    INNER JOIN campaigns c ON c.id = cc.campaign_id
    SET cc.template_id = c.template_id
    WHERE cc.template_id IS NULL
  `)

  if (!(await indexExists('campaign_channels', 'idx_campaign_channels_template'))) {
    await db.execute(`
      ALTER TABLE campaign_channels
      ADD INDEX idx_campaign_channels_template (template_id)
    `)
  }

  console.log('Channel templates are ready.')
}

run()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
