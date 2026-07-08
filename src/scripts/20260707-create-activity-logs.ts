import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      actor_name VARCHAR(160) NULL,
      actor_email VARCHAR(190) NULL,
      action VARCHAR(120) NOT NULL,
      resource VARCHAR(120) NOT NULL,
      resource_id VARCHAR(120) NULL,
      message VARCHAR(500) NOT NULL,
      metadata_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_activity_logs_created_at (created_at, id),
      KEY idx_activity_logs_user_created (user_id, created_at),
      KEY idx_activity_logs_resource_created (resource, created_at),
      KEY idx_activity_logs_action_created (action, created_at),
      CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  console.log('Activity logs table ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
