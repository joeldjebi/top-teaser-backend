import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaign_channels (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      campaign_id BIGINT UNSIGNED NOT NULL,
      channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL,
      communication_provider_id BIGINT UNSIGNED NULL,
      send_mode ENUM('single', 'bulk') NOT NULL DEFAULT 'single',
      status ENUM('draft', 'ready', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'ready',
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_campaign_channel (campaign_id, channel),
      KEY idx_campaign_channels_campaign_status (campaign_id, status),
      KEY idx_campaign_channels_provider (communication_provider_id),
      KEY idx_campaign_channels_channel (channel),
      CONSTRAINT fk_campaign_channels_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      CONSTRAINT fk_campaign_channels_provider FOREIGN KEY (communication_provider_id) REFERENCES communication_providers(id) ON DELETE SET NULL
    )
  `)

  await db.execute(`
    INSERT IGNORE INTO campaign_channels
      (campaign_id, channel, communication_provider_id, send_mode, status, error_message)
    SELECT id, channel, communication_provider_id, send_mode, status, error_message
    FROM campaigns
  `)

  console.log('Campaign channels table ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
