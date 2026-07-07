export type ContactStatus = 'active' | 'invalid' | 'bounced' | 'unsubscribed'

export type Contact = {
  id: number
  email: string
  fullName: string | null
  mobileNumber: string | null
  commune: string | null
  country: string | null
  firstName: string | null
  lastName: string | null
  status: ContactStatus
  unsubscribedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateContactInput = {
  email: string
  fullName?: string | null
  mobileNumber?: string | null
  commune?: string | null
  country?: string | null
  firstName?: string | null
  lastName?: string | null
  status?: ContactStatus
}

export type UpdateContactInput = Partial<CreateContactInput> & {
  unsubscribedAt?: string | null
}
