import type { RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { MailSettingKey } from './mail-settings.types.js'

let settingsCache: Partial<Record<MailSettingKey, string>> | null = null

type MailSettingRow = RowDataPacket & {
  config_key: MailSettingKey
  config_value: string
}

export async function ensureMailSettingsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mail_settings (
      config_key VARCHAR(120) NOT NULL PRIMARY KEY,
      config_value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
}

export async function loadMailSettings() {
  await ensureMailSettingsTable()

  const [rows] = await db.execute<MailSettingRow[]>(
    'SELECT config_key, config_value FROM mail_settings',
  )

  settingsCache = rows.reduce<Partial<Record<MailSettingKey, string>>>(
    (settings, row) => ({
      ...settings,
      [row.config_key]: row.config_value,
    }),
    {},
  )

  return settingsCache
}

export async function ensureMailSettingsLoaded() {
  if (!settingsCache) {
    await loadMailSettings()
  }

  return settingsCache ?? {}
}

export function getCachedMailSetting(key: MailSettingKey) {
  return settingsCache?.[key]
}

export async function upsertMailSettings(
  settings: Partial<Record<MailSettingKey, string>>,
) {
  await ensureMailSettingsTable()

  const entries = Object.entries(settings).filter(([, value]) => value !== '')

  if (entries.length === 0) {
    return loadMailSettings()
  }

  await Promise.all(
    entries.map(([key, value]) =>
      db.execute(
        `INSERT INTO mail_settings (config_key, config_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [key, value],
      ),
    ),
  )

  return loadMailSettings()
}
