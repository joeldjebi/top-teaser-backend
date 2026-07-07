import type { Contact } from '../contacts/contacts.types.js'

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled'

export type CampaignRecipientStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'

export type CampaignSendMode = 'single' | 'bulk'

export type Campaign = {
  id: number
  name: string
  subject: string
  templateId: number
  contactListId: number
  sendMode: CampaignSendMode
  status: CampaignStatus
  errorMessage: string | null
  scheduledAt: string | null
  sentAt: string | null
  recipientsCount: number
  createdAt: string
  updatedAt: string
}

export type CampaignRecipient = {
  id: number
  campaignId: number
  contactId: number
  providerMessageId: string | null
  status: CampaignRecipientStatus
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
  contact: Contact
}

export type CreateCampaignInput = {
  name: string
  subject: string
  templateId: number
  contactListId: number
  sendMode?: CampaignSendMode
  scheduledAt?: string | null
}

export type UpdateCampaignInput = Partial<CreateCampaignInput> & {
  status?: CampaignStatus
  errorMessage?: string | null
}

export type CampaignStats = {
  total: number
  pending: number
  sent: number
  failed: number
  bounced: number
  opened: number
  clicked: number
  unsubscribed: number
}
