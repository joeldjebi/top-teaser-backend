export type TechnicalLogLevel = 'debug' | 'info' | 'warning' | 'error'

export type TechnicalLog = {
  id: number
  level: TechnicalLogLevel
  scope: string
  event: string
  message: string
  campaignId: number | null
  campaignChannelId: number | null
  provider: string | null
  payload: unknown
  response: unknown
  error: string | null
  createdAt: string
}

export type CreateTechnicalLogInput = {
  level?: TechnicalLogLevel
  scope: string
  event: string
  message: string
  campaignId?: number | null
  campaignChannelId?: number | null
  provider?: string | null
  payload?: unknown
  response?: unknown
  error?: string | null
}
