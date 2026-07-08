import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type {
  CommunicationProvider,
  CommunicationProviderLimits,
  CommunicationProviderVariable,
  CreateCommunicationProviderInput,
  UpdateCommunicationProviderInput,
} from './communication-providers.types.js'

type CommunicationProviderRow = RowDataPacket & {
  id: number
  channel: CommunicationProvider['channel']
  name: string
  provider_key: string
  is_active: 0 | 1
  variables_json: string | CommunicationProviderVariable[]
  limits_json: string | CommunicationProviderLimits
  created_at: Date
  updated_at: Date
}

function parseJson<T>(value: string | T, fallback: T): T {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function mapProvider(row: CommunicationProviderRow): CommunicationProvider {
  return {
    id: row.id,
    channel: row.channel,
    name: row.name,
    providerKey: row.provider_key,
    isActive: Boolean(row.is_active),
    variables: parseJson<CommunicationProviderVariable[]>(
      row.variables_json,
      [],
    ),
    limits: parseJson<CommunicationProviderLimits>(row.limits_json, {
      batchSize: 100,
      maxPerDay: 10000,
      maxPerHour: 1000,
      maxPerMinute: 60,
    }),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listCommunicationProviders(): Promise<
  CommunicationProvider[]
> {
  const [rows] = await db.execute<CommunicationProviderRow[]>(
    `SELECT id, channel, name, provider_key, is_active, variables_json,
            limits_json, created_at, updated_at
     FROM communication_providers
     ORDER BY channel ASC, is_active DESC, created_at DESC, id DESC`,
  )

  return rows.map(mapProvider)
}

export async function findCommunicationProviderById(
  id: number,
): Promise<CommunicationProvider | null> {
  const [rows] = await db.execute<CommunicationProviderRow[]>(
    `SELECT id, channel, name, provider_key, is_active, variables_json,
            limits_json, created_at, updated_at
     FROM communication_providers
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  return rows[0] ? mapProvider(rows[0]) : null
}

export async function createCommunicationProvider(
  input: CreateCommunicationProviderInput,
): Promise<CommunicationProvider> {
  if (input.isActive) {
    await deactivateChannelProviders(input.channel)
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO communication_providers
       (channel, name, provider_key, is_active, variables_json, limits_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.channel,
      input.name,
      input.providerKey,
      input.isActive ? 1 : 0,
      JSON.stringify(input.variables),
      JSON.stringify(input.limits),
    ],
  )

  const provider = await findCommunicationProviderById(result.insertId)

  if (!provider) {
    throw new Error('Communication provider was created but could not be loaded.')
  }

  return provider
}

export async function updateCommunicationProvider(
  id: number,
  input: UpdateCommunicationProviderInput,
): Promise<CommunicationProvider | null> {
  const existing = await findCommunicationProviderById(id)

  if (!existing) {
    return null
  }

  const nextChannel = input.channel ?? existing.channel

  if (input.isActive) {
    await deactivateChannelProviders(nextChannel)
  }

  const fields: string[] = []
  const values: Array<string | number> = []

  if (input.channel !== undefined) {
    fields.push('channel = ?')
    values.push(input.channel)
  }

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.providerKey !== undefined) {
    fields.push('provider_key = ?')
    values.push(input.providerKey)
  }

  if (input.isActive !== undefined) {
    fields.push('is_active = ?')
    values.push(input.isActive ? 1 : 0)
  }

  if (input.variables !== undefined) {
    fields.push('variables_json = ?')
    values.push(JSON.stringify(input.variables))
  }

  if (input.limits !== undefined) {
    fields.push('limits_json = ?')
    values.push(JSON.stringify(input.limits))
  }

  if (fields.length > 0) {
    await db.execute(
      `UPDATE communication_providers
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, id],
    )
  }

  return findCommunicationProviderById(id)
}

export async function deleteCommunicationProvider(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM communication_providers WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}

async function deactivateChannelProviders(
  channel: CommunicationProvider['channel'],
) {
  await db.execute(
    `UPDATE communication_providers
     SET is_active = 0
     WHERE channel = ?`,
    [channel],
  )
}
