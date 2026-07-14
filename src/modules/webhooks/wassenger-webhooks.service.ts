import { env } from '../../config/env.js'

const WASSENGER_API_BASE_URL = 'https://api.wassenger.com/v1'
const DEFAULT_WASSENGER_EVENTS = [
  'message:out:new',
  'message:out:sent',
  'message:out:ack',
  'message:out:failed',
]

export async function registerWassengerWebhook(input: {
  device?: string
  events?: string[]
  name?: string
  url?: string
}) {
  if (!env.wassenger.apiToken) {
    throw new Error('WASSENGER_API_TOKEN est manquant dans le fichier .env.')
  }

  const webhookUrl = input.url ?? buildDefaultWebhookUrl()
  const payload = {
    name: input.name ?? 'Top Teaser',
    url: webhookUrl,
    events:
      input.events && input.events.length > 0
        ? input.events
        : DEFAULT_WASSENGER_EVENTS,
    ...(input.device ? { device: input.device } : {}),
  }

  const response = await fetch(`${WASSENGER_API_BASE_URL}/webhooks`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      Token: env.wassenger.apiToken,
    },
    method: 'POST',
  })
  const text = await response.text()
  const data = parseJson(text)

  if (!response.ok) {
    throw new Error(
      `Wassenger webhook error (${response.status}): ${text || response.statusText}`,
    )
  }

  return {
    request: payload,
    response: data,
  }
}

function buildDefaultWebhookUrl() {
  const baseUrl = env.appUrl.replace(/\/$/, '')
  const secret = env.wassenger.webhookSecret

  return `${baseUrl}/api/webhooks/wassenger${secret ? `?token=${encodeURIComponent(secret)}` : ''}`
}

function parseJson(text: string) {
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}
