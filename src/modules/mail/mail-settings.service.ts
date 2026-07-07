import { env } from '../../config/env.js'
import type {
  MailProviderConfigField,
  MailSettingKey,
  MailSettingsUpdateInput,
} from './mail-settings.types.js'
import type { MailProviderKey } from './providers/mail-provider.js'
import {
  ensureMailSettingsLoaded,
  getCachedMailSetting,
  upsertMailSettings,
} from './mail-settings.repository.js'

export const providerConfigFields: Record<
  MailProviderKey,
  MailProviderConfigField[]
> = {
  postmark: [
    {
      key: 'POSTMARK_SERVER_TOKEN',
      label: 'Server token Postmark',
      secret: true,
    },
    {
      key: 'POSTMARK_MESSAGE_STREAM',
      label: 'Message Stream Postmark',
      secret: false,
    },
    {
      key: 'POSTMARK_SINGLE_ENABLED',
      label: 'Activer l’envoi classique Postmark',
      secret: false,
      inputType: 'switch',
    },
    {
      key: 'POSTMARK_BULK_ENABLED',
      label: 'Activer l’envoi Bulk Postmark',
      secret: false,
      inputType: 'switch',
    },
  ],
  sendgrid: [
    {
      key: 'SENDGRID_API_KEY',
      label: 'API key SendGrid',
      secret: true,
    },
  ],
  mailgun: [
    {
      key: 'MAILGUN_API_KEY',
      label: 'API key Mailgun',
      secret: true,
    },
    {
      key: 'MAILGUN_DOMAIN',
      label: 'Domaine Mailgun',
      secret: false,
    },
  ],
  brevo: [
    {
      key: 'BREVO_API_KEY',
      label: 'API key Brevo',
      secret: true,
    },
  ],
  'amazon-ses': [
    {
      key: 'AWS_SES_REGION',
      label: 'Région AWS SES',
      secret: false,
    },
    {
      key: 'AWS_SES_ACCESS_KEY_ID',
      label: 'Access key ID',
      secret: true,
    },
    {
      key: 'AWS_SES_SECRET_ACCESS_KEY',
      label: 'Secret access key',
      secret: true,
    },
  ],
}

export async function getMailSettingsSnapshot() {
  await ensureMailSettingsLoaded()

  const activeProvider = getMailProviderSetting()
  const from = getMailSetting('MAIL_FROM') ?? env.mail.from

  return {
    activeProvider,
    from,
    providers: Object.entries(providerConfigFields).map(([key, fields]) => ({
      key,
      fields: fields.map((field) => {
        const value = getMailSetting(field.key)

        return {
          ...field,
          configured: Boolean(value),
          value: field.secret ? undefined : value ?? '',
        }
      }),
    })),
  }
}

export async function updateMailSettings(input: MailSettingsUpdateInput) {
  const allowedKeys = new Set<MailSettingKey>([
    'MAIL_PROVIDER',
    'MAIL_FROM',
    ...Object.values(providerConfigFields).flatMap((fields) =>
      fields.map((field) => field.key),
    ),
  ])
  const settings: Partial<Record<MailSettingKey, string>> = {}

  if (input.provider) {
    settings.MAIL_PROVIDER = input.provider
  }

  if (input.from) {
    settings.MAIL_FROM = input.from
  }

  Object.entries(input.config ?? {}).forEach(([key, value]) => {
    if (!allowedKeys.has(key as MailSettingKey)) {
      return
    }

    const normalizedValue = value.trim()

    if (normalizedValue) {
      settings[key as MailSettingKey] = normalizedValue
    }
  })

  await upsertMailSettings(settings)

  return getMailSettingsSnapshot()
}

export function getMailProviderSetting(): MailProviderKey {
  return (
    (getCachedMailSetting('MAIL_PROVIDER') as MailProviderKey | undefined) ??
    env.mail.provider
  )
}

export function getMailSetting(key: MailSettingKey) {
  return getCachedMailSetting(key) ?? getEnvMailSetting(key)
}

function getEnvMailSetting(key: MailSettingKey) {
  const values: Record<MailSettingKey, string | undefined> = {
    MAIL_PROVIDER: env.mail.provider,
    MAIL_FROM: env.mail.from,
    POSTMARK_SERVER_TOKEN: env.mail.postmarkServerToken,
    POSTMARK_MESSAGE_STREAM: env.mail.postmarkMessageStream,
    POSTMARK_SINGLE_ENABLED: env.mail.postmarkSingleEnabled,
    POSTMARK_BULK_ENABLED: env.mail.postmarkBulkEnabled,
    SENDGRID_API_KEY: env.mail.sendgridApiKey,
    MAILGUN_API_KEY: env.mail.mailgunApiKey,
    MAILGUN_DOMAIN: env.mail.mailgunDomain,
    BREVO_API_KEY: env.mail.brevoApiKey,
    AWS_SES_REGION: env.mail.amazonSesRegion,
    AWS_SES_ACCESS_KEY_ID: env.mail.amazonSesAccessKeyId,
    AWS_SES_SECRET_ACCESS_KEY: env.mail.amazonSesSecretAccessKey,
  }

  return values[key]
}
