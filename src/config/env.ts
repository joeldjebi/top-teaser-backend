import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  APP_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  DB_CONNECTION: z.literal('mysql').default('mysql'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USERNAME: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default('top_teaser'),
  MAIL_PROVIDER: z
    .enum(['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses'])
    .default('postmark'),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  POSTMARK_MESSAGE_STREAM: z.string().default('broadcast'),
  POSTMARK_SINGLE_ENABLED: z.string().default('true'),
  POSTMARK_BULK_ENABLED: z.string().default('false'),
  SENDGRID_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  WASSENGER_API_TOKEN: z.string().optional(),
  WASSENGER_DEFAULT_COUNTRY_CODE: z.string().default('225'),
  WASSENGER_WEBHOOK_SECRET: z.string().optional(),
  MAIL_FROM: z.string().email().default('no-reply@top-teaser.com'),
})

const parsed = envSchema.parse(process.env)

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  appUrl: parsed.APP_URL,
  appOrigins: (parsed.APP_ORIGINS ?? parsed.APP_URL)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  auth: {
    jwtSecret: parsed.JWT_SECRET,
    jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  },
  database: {
    host: parsed.DB_HOST,
    port: parsed.DB_PORT,
    user: parsed.DB_USERNAME,
    password: parsed.DB_PASSWORD,
    name: parsed.DB_DATABASE,
  },
  mail: {
    provider: parsed.MAIL_PROVIDER,
    postmarkServerToken: parsed.POSTMARK_SERVER_TOKEN,
    postmarkMessageStream: parsed.POSTMARK_MESSAGE_STREAM,
    postmarkSingleEnabled: parsed.POSTMARK_SINGLE_ENABLED,
    postmarkBulkEnabled: parsed.POSTMARK_BULK_ENABLED,
    sendgridApiKey: parsed.SENDGRID_API_KEY,
    mailgunApiKey: parsed.MAILGUN_API_KEY,
    mailgunDomain: parsed.MAILGUN_DOMAIN,
    brevoApiKey: parsed.BREVO_API_KEY,
    amazonSesRegion: parsed.AWS_SES_REGION,
    amazonSesAccessKeyId: parsed.AWS_SES_ACCESS_KEY_ID,
    amazonSesSecretAccessKey: parsed.AWS_SES_SECRET_ACCESS_KEY,
    from: parsed.MAIL_FROM,
  },
  wassenger: {
    apiToken: parsed.WASSENGER_API_TOKEN,
    defaultCountryCode: parsed.WASSENGER_DEFAULT_COUNTRY_CODE,
    webhookSecret: parsed.WASSENGER_WEBHOOK_SECRET,
  },
}
