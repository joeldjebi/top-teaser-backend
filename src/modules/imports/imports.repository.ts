import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type {
  ContactImport,
  ContactImportRowStatus,
  ContactImportStatus,
  ContactImportSummary,
} from './imports.types.js'

type ContactImportRow = RowDataPacket & {
  id: number
  original_filename: string
  status: ContactImportStatus
  total_rows: number
  imported_rows: number
  duplicate_rows: number
  invalid_rows: number
  summary: ContactImportSummary | string | null
  error_message: string | null
  created_at: Date
  updated_at: Date
}

function parseSummary(
  summary: ContactImportSummary | string | null,
): ContactImportSummary | null {
  if (!summary) {
    return null
  }

  if (typeof summary === 'string') {
    return JSON.parse(summary) as ContactImportSummary
  }

  return summary
}

function mapContactImport(row: ContactImportRow): ContactImport {
  return {
    id: row.id,
    originalFilename: row.original_filename,
    status: row.status,
    totalRows: row.total_rows,
    importedRows: row.imported_rows,
    duplicateRows: row.duplicate_rows,
    invalidRows: row.invalid_rows,
    summary: parseSummary(row.summary),
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function createContactImportRecord(input: {
  originalFilename: string
  status: ContactImportStatus
  summary: ContactImportSummary
  errorMessage?: string | null
}): Promise<ContactImport> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO contact_imports
       (original_filename, status, total_rows, imported_rows, duplicate_rows, invalid_rows, summary, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.originalFilename,
      input.status,
      input.summary.totalRows,
      input.summary.importedRows,
      input.summary.duplicateRows,
      input.summary.invalidRows,
      JSON.stringify(input.summary),
      input.errorMessage ?? null,
    ],
  )

  await insertContactImportRows(result.insertId, input.summary.rows)

  const contactImport = await findContactImportById(result.insertId)

  if (!contactImport) {
    throw new Error('Contact import was created but could not be loaded.')
  }

  return contactImport
}

async function insertContactImportRows(
  contactImportId: number,
  rows: ContactImportSummary['rows'],
) {
  if (rows.length === 0) {
    return
  }

  await db.query(
    `INSERT INTO contact_import_rows
       (contact_import_id, row_number, email, status, reason)
     VALUES ?`,
    [
      rows.map((row) => [
        contactImportId,
        row.rowNumber,
        row.email,
        row.status satisfies ContactImportRowStatus,
        row.reason,
      ]),
    ],
  )
}

export async function findContactImportById(
  id: number,
): Promise<ContactImport | null> {
  const [rows] = await db.execute<ContactImportRow[]>(
    `SELECT id, original_filename, status, total_rows, imported_rows, duplicate_rows,
            invalid_rows, summary, error_message, created_at, updated_at
     FROM contact_imports
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  const contactImport = rows[0]

  return contactImport ? mapContactImport(contactImport) : null
}
