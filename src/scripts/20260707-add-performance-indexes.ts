import type { RowDataPacket } from 'mysql2'
import { db } from '../database/mysql.js'

type IndexRow = RowDataPacket & {
  INDEX_NAME: string
}

type IndexDefinition = {
  name: string
  sql: string
  table: string
}

const indexes: IndexDefinition[] = [
  {
    table: 'contacts',
    name: 'idx_contacts_created_at',
    sql: 'ALTER TABLE contacts ADD INDEX idx_contacts_created_at (created_at, id)',
  },
  {
    table: 'contacts',
    name: 'idx_contacts_status_unsubscribed',
    sql: 'ALTER TABLE contacts ADD INDEX idx_contacts_status_unsubscribed (status, unsubscribed_at)',
  },
  {
    table: 'contacts',
    name: 'idx_contacts_commune_country',
    sql: 'ALTER TABLE contacts ADD INDEX idx_contacts_commune_country (commune, country)',
  },
  {
    table: 'contact_lists',
    name: 'idx_contact_lists_created_at',
    sql: 'ALTER TABLE contact_lists ADD INDEX idx_contact_lists_created_at (created_at, id)',
  },
  {
    table: 'contact_list_items',
    name: 'idx_contact_list_items_contact_id',
    sql: 'ALTER TABLE contact_list_items ADD INDEX idx_contact_list_items_contact_id (contact_id)',
  },
  {
    table: 'contact_imports',
    name: 'idx_contact_imports_created_at',
    sql: 'ALTER TABLE contact_imports ADD INDEX idx_contact_imports_created_at (created_at, id)',
  },
  {
    table: 'contact_imports',
    name: 'idx_contact_imports_status_created',
    sql: 'ALTER TABLE contact_imports ADD INDEX idx_contact_imports_status_created (status, created_at)',
  },
  {
    table: 'contact_import_rows',
    name: 'idx_contact_import_rows_import_status',
    sql: 'ALTER TABLE contact_import_rows ADD INDEX idx_contact_import_rows_import_status (contact_import_id, status)',
  },
  {
    table: 'contact_import_rows',
    name: 'idx_contact_import_rows_email',
    sql: 'ALTER TABLE contact_import_rows ADD INDEX idx_contact_import_rows_email (email)',
  },
  {
    table: 'email_templates',
    name: 'idx_email_templates_created_at',
    sql: 'ALTER TABLE email_templates ADD INDEX idx_email_templates_created_at (created_at, id)',
  },
  {
    table: 'campaigns',
    name: 'idx_campaigns_status_scheduled',
    sql: 'ALTER TABLE campaigns ADD INDEX idx_campaigns_status_scheduled (status, scheduled_at)',
  },
  {
    table: 'campaigns',
    name: 'idx_campaigns_created_at',
    sql: 'ALTER TABLE campaigns ADD INDEX idx_campaigns_created_at (created_at, id)',
  },
  {
    table: 'campaigns',
    name: 'idx_campaigns_template_id',
    sql: 'ALTER TABLE campaigns ADD INDEX idx_campaigns_template_id (template_id)',
  },
  {
    table: 'campaigns',
    name: 'idx_campaigns_contact_list_id',
    sql: 'ALTER TABLE campaigns ADD INDEX idx_campaigns_contact_list_id (contact_list_id)',
  },
  {
    table: 'campaign_recipients',
    name: 'idx_campaign_recipients_campaign_status',
    sql: 'ALTER TABLE campaign_recipients ADD INDEX idx_campaign_recipients_campaign_status (campaign_id, status)',
  },
  {
    table: 'campaign_recipients',
    name: 'idx_campaign_recipients_contact_id',
    sql: 'ALTER TABLE campaign_recipients ADD INDEX idx_campaign_recipients_contact_id (contact_id)',
  },
  {
    table: 'campaign_recipients',
    name: 'idx_campaign_recipients_provider_message',
    sql: 'ALTER TABLE campaign_recipients ADD INDEX idx_campaign_recipients_provider_message (provider_message_id)',
  },
  {
    table: 'campaign_recipients',
    name: 'idx_campaign_recipients_created_at',
    sql: 'ALTER TABLE campaign_recipients ADD INDEX idx_campaign_recipients_created_at (created_at, id)',
  },
  {
    table: 'email_events',
    name: 'idx_email_events_provider_message',
    sql: 'ALTER TABLE email_events ADD INDEX idx_email_events_provider_message (provider_message_id)',
  },
  {
    table: 'email_events',
    name: 'idx_email_events_recipient_occurred',
    sql: 'ALTER TABLE email_events ADD INDEX idx_email_events_recipient_occurred (campaign_recipient_id, occurred_at)',
  },
  {
    table: 'email_events',
    name: 'idx_email_events_type_occurred',
    sql: 'ALTER TABLE email_events ADD INDEX idx_email_events_type_occurred (event_type, occurred_at)',
  },
  {
    table: 'suppression_list',
    name: 'idx_suppression_list_reason_created',
    sql: 'ALTER TABLE suppression_list ADD INDEX idx_suppression_list_reason_created (reason, created_at)',
  },
]

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
  for (const index of indexes) {
    const exists = await indexExists(index.table, index.name)

    if (exists) {
      console.log(`${index.name} already exists on ${index.table}`)
      continue
    }

    console.log(`Adding ${index.name} on ${index.table}...`)
    await db.execute(index.sql)
    console.log(`Added ${index.name}`)
  }

  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exit(1)
})
