import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaign_channel_recipients (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      campaign_channel_id BIGINT UNSIGNED NOT NULL,
      campaign_recipient_id BIGINT UNSIGNED NOT NULL,
      contact_id BIGINT UNSIGNED NOT NULL,
      provider_message_id VARCHAR(190) NULL,
      status ENUM('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed') NOT NULL DEFAULT 'pending',
      error_message TEXT NULL,
      sent_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_recipient_per_campaign_channel (campaign_channel_id, campaign_recipient_id),
      KEY idx_campaign_channel_recipients_status (campaign_channel_id, status),
      KEY idx_campaign_channel_recipients_contact (contact_id),
      KEY idx_campaign_channel_recipients_provider_message (provider_message_id),
      CONSTRAINT fk_campaign_channel_recipients_channel FOREIGN KEY (campaign_channel_id) REFERENCES campaign_channels(id) ON DELETE CASCADE,
      CONSTRAINT fk_campaign_channel_recipients_recipient FOREIGN KEY (campaign_recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE,
      CONSTRAINT fk_campaign_channel_recipients_contact FOREIGN KEY (contact_id) REFERENCES contacts(id)
    )
  `)

  await db.execute(`
    INSERT IGNORE INTO campaign_channel_recipients
      (campaign_channel_id, campaign_recipient_id, contact_id, status, provider_message_id, error_message, sent_at)
    SELECT cc.id, cr.id, cr.contact_id, cr.status, cr.provider_message_id, cr.error_message, cr.sent_at
    FROM campaign_channels cc
    INNER JOIN campaign_recipients cr ON cr.campaign_id = cc.campaign_id
  `)

  console.log('Campaign channel recipients table ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
