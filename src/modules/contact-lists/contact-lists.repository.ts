import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type { Contact, ContactStatus } from '../contacts/contacts.types.js'
import type {
  ContactList,
  ContactListWithContacts,
  CreateContactListInput,
  UpdateContactListInput,
} from './contact-lists.types.js'

type ContactListRow = RowDataPacket & {
  id: number
  name: string
  description: string | null
  contacts_count: number
  created_at: Date
  updated_at: Date
}

type ContactRow = RowDataPacket & {
  id: number
  email: string
  full_name: string | null
  mobile_number: string | null
  commune: string | null
  country: string | null
  first_name: string | null
  last_name: string | null
  status: ContactStatus
  unsubscribed_at: Date | null
  created_at: Date
  updated_at: Date
}

function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function mapContactList(row: ContactListRow): ContactList {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contactsCount: Number(row.contacts_count),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapContact(row: ContactRow): Contact {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    commune: row.commune,
    country: row.country,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    unsubscribedAt: toIsoDate(row.unsubscribed_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listContactLists(): Promise<ContactList[]> {
  const [rows] = await db.execute<ContactListRow[]>(
    `SELECT cl.id, cl.name, cl.description, cl.created_at, cl.updated_at,
            COUNT(cli.id) AS contacts_count
     FROM contact_lists cl
     LEFT JOIN contact_list_items cli ON cli.contact_list_id = cl.id
     GROUP BY cl.id
     ORDER BY cl.created_at DESC, cl.id DESC`,
  )

  return rows.map(mapContactList)
}

export async function findContactListById(
  id: number,
): Promise<ContactListWithContacts | null> {
  const [rows] = await db.execute<ContactListRow[]>(
    `SELECT cl.id, cl.name, cl.description, cl.created_at, cl.updated_at,
            COUNT(cli.id) AS contacts_count
     FROM contact_lists cl
     LEFT JOIN contact_list_items cli ON cli.contact_list_id = cl.id
     WHERE cl.id = ?
     GROUP BY cl.id
     LIMIT 1`,
    [id],
  )

  const contactList = rows[0]

  if (!contactList) {
    return null
  }

  return {
    ...mapContactList(contactList),
    contacts: await listContactsForList(id),
  }
}

export async function createContactList(
  input: CreateContactListInput,
): Promise<ContactListWithContacts> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO contact_lists (name, description)
     VALUES (?, ?)`,
    [input.name, input.description ?? null],
  )

  const contactList = await findContactListById(result.insertId)

  if (!contactList) {
    throw new Error('Contact list was created but could not be loaded.')
  }

  return contactList
}

export async function updateContactList(
  id: number,
  input: UpdateContactListInput,
): Promise<ContactListWithContacts | null> {
  const fields: string[] = []
  const values: Array<string | null> = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.description !== undefined) {
    fields.push('description = ?')
    values.push(input.description)
  }

  if (fields.length > 0) {
    await db.execute(
      `UPDATE contact_lists
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, String(id)],
    )
  }

  return findContactListById(id)
}

export async function deleteContactList(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM contact_lists WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}

export async function clearContactLists(): Promise<{
  campaigns: number
  contactLists: number
}> {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [campaignsResult] = await connection.execute<ResultSetHeader>(
      `DELETE c
       FROM campaigns c
       INNER JOIN contact_lists cl ON cl.id = c.contact_list_id`,
    )
    const [contactListsResult] = await connection.execute<ResultSetHeader>(
      'DELETE FROM contact_lists',
    )

    await connection.commit()

    return {
      campaigns: campaignsResult.affectedRows,
      contactLists: contactListsResult.affectedRows,
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function addContactToList(
  contactListId: number,
  contactId: number,
): Promise<'attached' | 'already_attached'> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO contact_list_items (contact_list_id, contact_id)
     VALUES (?, ?)`,
    [contactListId, contactId],
  )

  return result.affectedRows > 0 ? 'attached' : 'already_attached'
}

export async function removeContactFromList(
  contactListId: number,
  contactId: number,
): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM contact_list_items
     WHERE contact_list_id = ? AND contact_id = ?`,
    [contactListId, contactId],
  )

  return result.affectedRows > 0
}

async function listContactsForList(contactListId: number): Promise<Contact[]> {
  const [rows] = await db.execute<ContactRow[]>(
    `SELECT c.id, c.email, c.full_name, c.mobile_number, c.commune, c.country,
            c.first_name, c.last_name, c.status,
            c.unsubscribed_at, c.created_at, c.updated_at
     FROM contacts c
     INNER JOIN contact_list_items cli ON cli.contact_id = c.id
     WHERE cli.contact_list_id = ?
     ORDER BY c.created_at DESC, c.id DESC`,
    [contactListId],
  )

  return rows.map(mapContact)
}
