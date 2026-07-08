export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'telegram'

export type CommunicationProviderVariable = {
  key: string
  label: string
  secret: boolean
  required: boolean
  value?: string
}

export type CommunicationProviderLimits = {
  maxPerMinute: number
  maxPerHour: number
  maxPerDay: number
  batchSize: number
}

export type CommunicationProvider = {
  id: number
  channel: CommunicationChannel
  name: string
  providerKey: string
  isActive: boolean
  variables: CommunicationProviderVariable[]
  limits: CommunicationProviderLimits
  createdAt: string
  updatedAt: string
}

export type CreateCommunicationProviderInput = {
  channel: Exclude<CommunicationChannel, 'email'>
  name: string
  providerKey: string
  isActive?: boolean
  variables: CommunicationProviderVariable[]
  limits: CommunicationProviderLimits
}

export type UpdateCommunicationProviderInput =
  Partial<CreateCommunicationProviderInput>
