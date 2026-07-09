export type TemplateChannel = 'email' | 'sms' | 'whatsapp' | 'telegram'

export type EmailTemplate = {
  id: number
  channel: TemplateChannel
  name: string
  subject: string
  htmlContent: string
  textContent: string | null
  createdAt: string
  updatedAt: string
}

export type CreateEmailTemplateInput = {
  channel?: TemplateChannel
  name: string
  subject: string
  htmlContent: string
  textContent?: string | null
}

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput>

export type TemplateVariables = Record<string, string | number | boolean | null>
