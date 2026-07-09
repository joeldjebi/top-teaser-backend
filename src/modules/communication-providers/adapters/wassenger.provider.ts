import type { CommunicationProvider } from '../communication-providers.types.js'

const DEFAULT_BASE_URL = 'https://api.wassenger.com/v1'

export type WassengerMessageRequest = {
  endpoint: string
  headers: Record<string, string>
  method: 'POST'
  payload: {
    device: string
    phone: string
    message: string
    media?: {
      file: string
    }
  }
}

export function isWassengerProvider(provider: CommunicationProvider) {
  return (
    provider.channel === 'whatsapp' &&
    provider.providerKey.trim().toLowerCase() === 'wassenger'
  )
}

export function buildWassengerMessageRequest(input: {
  message: string
  phone: string | null | undefined
  provider: CommunicationProvider
}): WassengerMessageRequest {
  const apiToken =
    getProviderVariable(input.provider, 'api_token') ??
    getProviderVariable(input.provider, 'api_key') ??
    getProviderVariable(input.provider, 'bearer_token')
  const deviceId =
    getProviderVariable(input.provider, 'device_id') ??
    getProviderVariable(input.provider, 'device')

  if (!apiToken) {
    throw new Error('Configurez la variable api_token sur le provider Wassenger.')
  }

  if (!deviceId) {
    throw new Error('Configurez la variable device_id sur le provider Wassenger.')
  }

  const message = input.message.trim()

  if (!message) {
    throw new Error('Le message WhatsApp Wassenger est vide.')
  }

  const fileId = getProviderVariable(input.provider, 'media_file_id')
  const payload: WassengerMessageRequest['payload'] = {
    device: deviceId,
    phone: normalizeWassengerPhone(input.phone),
    message,
  }

  if (fileId) {
    payload.media = { file: fileId }
  }

  return {
    endpoint: getWassengerMessagesEndpoint(input.provider),
    headers: {
      Authorization: apiToken,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    payload,
  }
}

export function extractWassengerMessageId(response: unknown) {
  if (!response || typeof response !== 'object') return undefined

  const record = response as Record<string, unknown>
  const id =
    record.id ??
    record.message ??
    record.messageId ??
    record.message_id ??
    (record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).id
      : undefined)

  return id ? String(id) : undefined
}

function getWassengerMessagesEndpoint(provider: CommunicationProvider) {
  const explicitEndpoint =
    getProviderVariable(provider, 'endpoint_url') ??
    getProviderVariable(provider, 'url')

  if (explicitEndpoint) {
    return explicitEndpoint
  }

  const baseUrl =
    getProviderVariable(provider, 'base_url') ??
    getProviderVariable(provider, 'api_url') ??
    DEFAULT_BASE_URL

  return `${baseUrl.replace(/\/+$/, '').replace(/\/messages$/, '')}/messages`
}

function normalizeWassengerPhone(phone: string | null | undefined) {
  const digits = String(phone ?? '').replace(/\D/g, '')

  if (digits.length < 8) {
    throw new Error(
      'Numéro WhatsApp invalide. Wassenger exige un numéro au format E.164, exemple +2250700000000.',
    )
  }

  return `+${digits}`
}

function getProviderVariable(
  provider: CommunicationProvider,
  key: string,
): string | undefined {
  const value = provider.variables.find((variable) => variable.key === key)?.value

  return value && value.trim().length > 0 ? value.trim() : undefined
}
