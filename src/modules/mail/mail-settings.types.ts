import type { MailProviderKey } from './providers/mail-provider.js'

export type MailSettingKey =
  | 'MAIL_PROVIDER'
  | 'MAIL_FROM'
  | 'POSTMARK_SERVER_TOKEN'
  | 'POSTMARK_MESSAGE_STREAM'
  | 'POSTMARK_SINGLE_ENABLED'
  | 'POSTMARK_BULK_ENABLED'
  | 'SENDGRID_API_KEY'
  | 'MAILGUN_API_KEY'
  | 'MAILGUN_DOMAIN'
  | 'BREVO_API_KEY'
  | 'AWS_SES_REGION'
  | 'AWS_SES_ACCESS_KEY_ID'
  | 'AWS_SES_SECRET_ACCESS_KEY'

export type MailProviderConfigField = {
  key: MailSettingKey
  label: string
  secret: boolean
  inputType?: 'text' | 'password' | 'switch'
}

export type MailSettingsUpdateInput = {
  provider?: MailProviderKey
  from?: string
  config?: Partial<Record<MailSettingKey, string>>
}
