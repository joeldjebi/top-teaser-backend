import type { Contact } from '../contacts/contacts.types.js'

export type ContactList = {
  id: number
  name: string
  description: string | null
  contactsCount: number
  createdAt: string
  updatedAt: string
}

export type ContactListWithContacts = ContactList & {
  contacts: Contact[]
}

export type CreateContactListInput = {
  name: string
  description?: string | null
}

export type UpdateContactListInput = Partial<CreateContactListInput>
