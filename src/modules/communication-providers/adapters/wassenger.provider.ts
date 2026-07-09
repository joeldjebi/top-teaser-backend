import type { CommunicationProvider } from '../communication-providers.types.js'

const DEFAULT_BASE_URL = 'https://api.wassenger.com/v1'
const WASSENGER_DEVICE_ID_PATTERN = /^[0-9A-Fa-f]{24}$/

export type WassengerMessageRequest = {
  endpoint: string
  headers: Record<string, string>
  method: 'POST'
  payload: {
    device: string
    phone: string
    message?: string
    template?: {
      name: string
      language?: string
      body?: Array<{
        name: string
        value: string
      }>
    }
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
  variables?: Record<string, string | number | boolean | null>
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

  if (!WASSENGER_DEVICE_ID_PATTERN.test(deviceId)) {
    throw new Error(
      'Device ID Wassenger invalide. Il doit contenir exactement 24 caractères hexadécimaux, exemple 64f1a2b3c4d5e6f7890abc12. Copiez l’identifiant depuis Wassenger > Devices, pas le numéro WhatsApp ni le nom du téléphone.',
    )
  }

  const message = input.message.trim()

  if (!message) {
    throw new Error('Le message WhatsApp Wassenger est vide.')
  }

  const fileId = getProviderVariable(input.provider, 'media_file_id')
  const templateName =
    getProviderVariable(input.provider, 'waba_template_name') ??
    getProviderVariable(input.provider, 'template_name')
  const templateLanguage =
    getProviderVariable(input.provider, 'waba_template_language') ??
    getProviderVariable(input.provider, 'template_language')
  const payload: WassengerMessageRequest['payload'] = {
    device: deviceId,
    phone: normalizeWassengerPhone(input.phone),
  }

  if (templateName) {
    payload.template = {
      name: templateName,
      ...(templateLanguage ? { language: templateLanguage } : {}),
      ...buildWassengerTemplateBody(input.provider, input.variables ?? {}),
    }
  } else {
    payload.message = message
  }

  if (fileId && !payload.template) {
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

function buildWassengerTemplateBody(
  provider: CommunicationProvider,
  variables: Record<string, string | number | boolean | null>,
) {
  const mapping =
    getProviderVariable(provider, 'waba_template_body_variables') ??
    getProviderVariable(provider, 'template_body_variables')

  if (!mapping) return {}

  const body = mapping
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [rawName, rawVariableKey] = item.includes('=')
        ? item.split('=')
        : item.includes(':')
          ? item.split(':')
          : [item, item]
      const name = rawName.trim()
      const variableKey = rawVariableKey.trim()
      const value = variables[variableKey]

      return {
        name,
        value: value === null || value === undefined ? '' : String(value),
      }
    })
    .filter((item) => /^[a-zA-Z0-9_]{1,32}$/.test(item.name))

  return body.length > 0 ? { body } : {}
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
