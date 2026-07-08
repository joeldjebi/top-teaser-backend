import { db } from '../database/mysql.js'

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS countries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(12) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_country_name (name),
      KEY idx_countries_name (name)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS communes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      country_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_commune_per_country (country_id, name),
      KEY idx_communes_name (name),
      CONSTRAINT fk_communes_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
    )
  `)

  console.log('Locations tables ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
