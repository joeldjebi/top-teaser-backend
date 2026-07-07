import type { CampaignRecipientStatus } from '../campaigns/campaigns.types.js'

export type EmailLog = {
  id: number
  campaignId: number
  campaignName: string
  contactId: number
  email: string
  providerMessageId: string | null
  status: CampaignRecipientStatus
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}
