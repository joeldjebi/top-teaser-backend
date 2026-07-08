import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'

type CountryRow = RowDataPacket & {
  id: number
  name: string
  code: string | null
  created_at: Date
  updated_at: Date
}

type CommuneRow = RowDataPacket & {
  id: number
  country_id: number
  name: string
  created_at: Date
  updated_at: Date
}

export type Commune = {
  id: number
  countryId: number
  name: string
  createdAt: string
  updatedAt: string
}

export type Country = {
  id: number
  name: string
  code: string | null
  communes: Commune[]
  createdAt: string
  updatedAt: string
}

function mapCommune(row: CommuneRow): Commune {
  return {
    id: row.id,
    countryId: row.country_id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapCountry(row: CountryRow, communes: Commune[]): Country {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    communes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listCountries() {
  const [countryRows] = await db.execute<CountryRow[]>(
    `SELECT id, name, code, created_at, updated_at
     FROM countries
     ORDER BY name ASC`,
  )
  const [communeRows] = await db.execute<CommuneRow[]>(
    `SELECT id, country_id, name, created_at, updated_at
     FROM communes
     ORDER BY name ASC`,
  )

  const communesByCountry = communeRows.reduce<Record<number, Commune[]>>(
    (groups, row) => {
      const commune = mapCommune(row)
      return {
        ...groups,
        [commune.countryId]: [...(groups[commune.countryId] ?? []), commune],
      }
    },
    {},
  )

  return countryRows.map((row) => mapCountry(row, communesByCountry[row.id] ?? []))
}

export async function findCountryById(id: number) {
  const countries = await listCountries()
  return countries.find((country) => country.id === id) ?? null
}

export async function createCountry(input: { name: string; code?: string | null }) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO countries (name, code)
     VALUES (?, ?)`,
    [input.name, input.code ?? null],
  )

  return findCountryById(result.insertId)
}

export async function updateCountry(
  id: number,
  input: Partial<{ name: string; code: string | null }>,
) {
  const fields: string[] = []
  const values: Array<string | null> = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.code !== undefined) {
    fields.push('code = ?')
    values.push(input.code)
  }

  if (fields.length > 0) {
    await db.execute(`UPDATE countries SET ${fields.join(', ')} WHERE id = ?`, [
      ...values,
      id,
    ])
  }

  return findCountryById(id)
}

export async function deleteCountry(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM countries WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}

export async function createCommune(input: { countryId: number; name: string }) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO communes (country_id, name)
     VALUES (?, ?)`,
    [input.countryId, input.name],
  )

  return findCommuneById(result.insertId)
}

export async function findCommuneById(id: number) {
  const [rows] = await db.execute<CommuneRow[]>(
    `SELECT id, country_id, name, created_at, updated_at
     FROM communes
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  return rows[0] ? mapCommune(rows[0]) : null
}

export async function updateCommune(id: number, input: { name: string }) {
  await db.execute('UPDATE communes SET name = ? WHERE id = ?', [input.name, id])
  return findCommuneById(id)
}

export async function deleteCommune(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM communes WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}
