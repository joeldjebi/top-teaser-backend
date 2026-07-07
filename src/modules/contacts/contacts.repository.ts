import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type {
  Contact,
  ContactStatus,
  CreateContactInput,
  UpdateContactInput,
} from './contacts.types.js'

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

function normalizeMobileNumber(value: string | null | undefined) {
  return value ? value.replace(/\s+/g, '') : value
}

export async function listContacts(): Promise<Contact[]> {
  const [rows] = await db.execute<ContactRow[]>(
    `SELECT id, email, full_name, mobile_number, commune, country,
            first_name, last_name, status, unsubscribed_at, created_at, updated_at
     FROM contacts
     ORDER BY created_at DESC, id DESC`,
  )

  return rows.map(mapContact)
}

export async function findContactById(id: number): Promise<Contact | null> {
  const [rows] = await db.execute<ContactRow[]>(
    `SELECT id, email, full_name, mobile_number, commune, country,
            first_name, last_name, status, unsubscribed_at, created_at, updated_at
     FROM contacts
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  const contact = rows[0]

  return contact ? mapContact(contact) : null
}

export async function findContactByEmailOrMobile(input: {
  email: string
  mobileNumber?: string | null
}): Promise<Contact | null> {
  const normalizedMobileNumber = normalizeMobileNumber(input.mobileNumber)
  const clauses = ['email = ?']
  const values: Array<string> = [input.email]

  if (normalizedMobileNumber) {
    clauses.push('mobile_number = ?')
    values.push(normalizedMobileNumber)
  }

  const [rows] = await db.execute<ContactRow[]>(
    `SELECT id, email, full_name, mobile_number, commune, country,
            first_name, last_name, status, unsubscribed_at, created_at, updated_at
     FROM contacts
     WHERE ${clauses.join(' OR ')}
     LIMIT 1`,
    values,
  )

  const contact = rows[0]

  return contact ? mapContact(contact) : null
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO contacts
       (email, full_name, mobile_number, commune, country, first_name, last_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.email,
      input.fullName ?? null,
      normalizeMobileNumber(input.mobileNumber) ?? null,
      input.commune ?? null,
      input.country ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      input.status ?? 'active',
    ],
  )

  const contact = await findContactById(result.insertId)

  if (!contact) {
    throw new Error('Contact was created but could not be loaded.')
  }

  return contact
}

export async function updateContact(
  id: number,
  input: UpdateContactInput,
): Promise<Contact | null> {
  const fields: string[] = []
  const values: Array<string | null> = []

  if (input.email !== undefined) {
    fields.push('email = ?')
    values.push(input.email)
  }

  if (input.fullName !== undefined) {
    fields.push('full_name = ?')
    values.push(input.fullName)
  }

  if (input.mobileNumber !== undefined) {
    fields.push('mobile_number = ?')
    values.push(normalizeMobileNumber(input.mobileNumber) ?? null)
  }

  if (input.commune !== undefined) {
    fields.push('commune = ?')
    values.push(input.commune)
  }

  if (input.country !== undefined) {
    fields.push('country = ?')
    values.push(input.country)
  }

  if (input.firstName !== undefined) {
    fields.push('first_name = ?')
    values.push(input.firstName)
  }

  if (input.lastName !== undefined) {
    fields.push('last_name = ?')
    values.push(input.lastName)
  }

  if (input.status !== undefined) {
    fields.push('status = ?')
    values.push(input.status)
  }

  if (input.unsubscribedAt !== undefined) {
    fields.push('unsubscribed_at = ?')
    values.push(input.unsubscribedAt)
  }

  if (fields.length > 0) {
    await db.execute(
      `UPDATE contacts
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, String(id)],
    )
  }

  return findContactById(id)
}

export async function deleteContact(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM contacts WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}
