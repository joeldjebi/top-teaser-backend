import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_invitations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      accepted_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_admin_invitations_user_created (user_id, created_at),
      KEY idx_admin_invitations_token_active (token_hash, accepted_at, expires_at),
      CONSTRAINT fk_admin_invitations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  console.log('Admin invitations table ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
