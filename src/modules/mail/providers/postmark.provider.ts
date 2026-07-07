import { getMailSetting } from '../mail-settings.service.js'
import { BaseMailProvider } from './base-provider.js'
import type {
  BulkMailStatusResult,
  SendBulkMailInput,
  SendBulkMailResult,
  SendMailInput,
  SendMailResult,
} from './mail-provider.js'

export class PostmarkProvider extends BaseMailProvider {
  key = 'postmark' as const
  name = 'Postmark'

  protected requiredConfig() {
    return {
      POSTMARK_SERVER_TOKEN: getMailSetting('POSTMARK_SERVER_TOKEN'),
      MAIL_FROM: getMailSetting('MAIL_FROM'),
    }
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    this.ensureConfigured()

    const response = await this.post('/email', {
      From: formatAddress(input.from ?? { email: getMailSetting('MAIL_FROM')! }),
      To: formatAddress(input.to),
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      MessageStream: getPostmarkMessageStream(),
      Metadata: stringifyMetadata(input.metadata),
    })

    return {
      provider: this.key,
      providerMessageId:
        typeof response.MessageID === 'string' ? response.MessageID : undefined,
      status: 'sent',
      raw: response,
    }
  }

  async sendBulk(input: SendBulkMailInput): Promise<SendBulkMailResult> {
    this.ensureConfigured()

    if (input.recipients.length === 0) {
      throw new Error('No recipients provided for Postmark bulk send.')
    }

    const response = await this.post('/email/bulk', {
      From: formatAddress(input.from ?? { email: getMailSetting('MAIL_FROM')! }),
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      MessageStream: getPostmarkMessageStream(),
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
      InlineCss: true,
      Tag: input.tag,
      Metadata: stringifyMetadata(input.metadata),
      Messages: input.recipients.map((recipient) => ({
        To: formatAddress(recipient.to),
        TemplateModel: normalizeTemplateModel(recipient.variables),
        Metadata: stringifyMetadata(recipient.metadata),
      })),
    })

    return {
      provider: this.key,
      bulkRequestId: getPostmarkBulkRequestId(response),
      status: response.Status === 'Failed' ? 'failed' : 'queued',
      raw: response,
    }
  }

  async getBulkStatus(bulkRequestId: string): Promise<BulkMailStatusResult> {
    this.ensureConfigured()

    const response = await this.get(`/email/bulk/${bulkRequestId}`)

    return {
      provider: this.key,
      bulkRequestId,
      status: normalizeBulkStatus(response.Status),
      percentageCompleted:
        typeof response.PercentageCompleted === 'number'
          ? response.PercentageCompleted
          : undefined,
      totalMessages:
        typeof response.TotalMessages === 'number'
          ? response.TotalMessages
          : undefined,
      raw: response,
    }
  }

  private ensureConfigured() {
    const health = this.getHealth()

    if (!health.configured) {
      throw new Error(
        `Postmark configuration incomplete: ${health.missingConfig.join(', ')}`,
      )
    }
  }

  private async post(path: string, payload: unknown) {
    const response = await fetch(`https://api.postmarkapp.com${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': getMailSetting('POSTMARK_SERVER_TOKEN')!,
      },
      body: JSON.stringify(payload),
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      const error = new Error(getPostmarkErrorMessage(body, response.status)) as Error & {
        response?: unknown
        status?: number
      }
      error.response = body
      error.status = response.status
      throw error
    }

    return body as Record<string, unknown>
  }

  private async get(path: string) {
    const response = await fetch(`https://api.postmarkapp.com${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Postmark-Server-Token': getMailSetting('POSTMARK_SERVER_TOKEN')!,
      },
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      const error = new Error(getPostmarkErrorMessage(body, response.status)) as Error & {
        response?: unknown
        status?: number
      }
      error.response = body
      error.status = response.status
      throw error
    }

    return body as Record<string, unknown>
  }
}

function formatAddress(address: { email: string; name?: string }) {
  if (!address.name) {
    return address.email
  }

  return `${address.name.replaceAll('"', '\\"')} <${address.email}>`
}

function getPostmarkMessageStream() {
  return getMailSetting('POSTMARK_MESSAGE_STREAM') ?? 'broadcast'
}

function stringifyMetadata(
  metadata: Record<string, string | number | boolean> | undefined,
) {
  if (!metadata) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, String(value)]),
  )
}

function normalizeTemplateModel(
  variables:
    | Record<string, string | number | boolean | null | undefined>
    | undefined,
) {
  if (!variables) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [key, value ?? '']),
  )
}

function normalizeBulkStatus(
  status: unknown,
): BulkMailStatusResult['status'] {
  if (typeof status !== 'string') {
    return 'unknown'
  }

  const normalized = status.toLowerCase()

  if (normalized === 'accepted') return 'accepted'
  if (normalized === 'processing') return 'processing'
  if (normalized === 'completed') return 'completed'
  if (normalized === 'failed') return 'failed'

  return 'unknown'
}

function getPostmarkBulkRequestId(response: Record<string, unknown>) {
  const id = response.ID ?? response.Id ?? response.id

  return typeof id === 'string' ? id : undefined
}

function getPostmarkErrorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object' && 'Message' in body) {
    return `Postmark error (${status}): ${String(body.Message)}`
  }

  return `Postmark request failed with status ${status}.`
}
