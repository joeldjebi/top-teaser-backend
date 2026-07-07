export type MailProviderKey =
  | 'postmark'
  | 'sendgrid'
  | 'mailgun'
  | 'brevo'
  | 'amazon-ses'

export type MailAddress = {
  email: string
  name?: string
}

export type SendMailInput = {
  from?: MailAddress
  to: MailAddress
  subject: string
  html: string
  text?: string
  metadata?: Record<string, string | number | boolean>
}

export type SendMailResult = {
  provider: MailProviderKey
  providerMessageId?: string
  status: 'sent' | 'queued'
  raw?: unknown
}

export type BulkMailRecipient = {
  id?: number
  contactId?: number
  to: MailAddress
  variables?: Record<string, string | number | boolean | null | undefined>
  metadata?: Record<string, string | number | boolean>
}

export type SendBulkMailInput = {
  from?: MailAddress
  subject: string
  html: string
  text?: string
  tag?: string
  metadata?: Record<string, string | number | boolean>
  recipients: BulkMailRecipient[]
}

export type SendBulkMailResult = {
  provider: MailProviderKey
  bulkRequestId?: string
  status: 'queued' | 'failed'
  raw?: unknown
}

export type BulkMailStatusResult = {
  provider: MailProviderKey
  bulkRequestId: string
  status: 'accepted' | 'processing' | 'completed' | 'failed' | 'unknown'
  percentageCompleted?: number
  totalMessages?: number
  raw?: unknown
}

export type MailProviderHealth = {
  configured: boolean
  missingConfig: string[]
}

export interface MailProvider {
  key: MailProviderKey
  name: string
  getHealth(): MailProviderHealth
  send(input: SendMailInput): Promise<SendMailResult>
  sendBulk?(input: SendBulkMailInput): Promise<SendBulkMailResult>
  getBulkStatus?(bulkRequestId: string): Promise<BulkMailStatusResult>
}
