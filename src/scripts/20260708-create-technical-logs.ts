import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS technical_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      level ENUM('debug', 'info', 'warning', 'error') NOT NULL DEFAULT 'info',
      scope VARCHAR(80) NOT NULL,
      event VARCHAR(120) NOT NULL,
      message VARCHAR(500) NOT NULL,
      campaign_id BIGINT UNSIGNED NULL,
      campaign_channel_id BIGINT UNSIGNED NULL,
      provider VARCHAR(120) NULL,
      payload_json JSON NULL,
      response_json JSON NULL,
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_technical_logs_created_at (created_at, id),
      KEY idx_technical_logs_scope_event (scope, event),
      KEY idx_technical_logs_campaign (campaign_id, campaign_channel_id),
      KEY idx_technical_logs_level_created (level, created_at),
      CONSTRAINT fk_technical_logs_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
      CONSTRAINT fk_technical_logs_campaign_channel FOREIGN KEY (campaign_channel_id) REFERENCES campaign_channels(id) ON DELETE SET NULL
    )
  `)

  console.log('Technical logs table ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
