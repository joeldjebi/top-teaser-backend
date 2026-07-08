import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'
import {
  createContact,
  findContactByEmailOrMobile,
} from '../contacts/contacts.repository.js'
import { csvContactRowSchema } from './imports.schemas.js'
import type { ContactImportSummary } from './imports.types.js'

type CsvRecord = Record<string, string | undefined>

function readColumn(record: CsvRecord, names: string[]) {
  for (const name of names) {
    const value = record[name]

    if (value) {
      return value
    }
  }

  return undefined
}

function normalizeMobileNumber(value: string | null | undefined) {
  return value ? value.replace(/\s+/g, '') : value
}

export async function importContactsFromFile(input: {
  buffer: Buffer
  originalFilename: string
  mimeType?: string
}) {
  const records = await readRecords(input)

  return importContactRecords(records)
}

async function readRecords(input: {
  buffer: Buffer
  originalFilename: string
  mimeType?: string
}) {
  const filename = input.originalFilename.toLowerCase()

  if (filename.endsWith('.xls')) {
    return readHtmlTableRecords(input.buffer)
  }

  if (
    filename.endsWith('.xlsx') ||
    input.mimeType?.includes('spreadsheet') ||
    input.mimeType?.includes('excel')
  ) {
    return readExcelRecords(input.buffer)
  }

  return readCsvRecords(input.buffer)
}

function readCsvRecords(buffer: Buffer) {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRecord[]
}

async function readExcelRecords(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook()
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
  await workbook.xlsx.load(
    arrayBuffer as Parameters<typeof workbook.xlsx.load>[0],
  )
  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    return []
  }

  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values as Array<string | number | undefined>
  const records: CsvRecord[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }

    const record: CsvRecord = {}

    for (let index = 1; index < headers.length; index += 1) {
      const header = headers[index]

      if (!header) {
        continue
      }

      const cell = row.getCell(index)
      const value = cell.text?.trim()

      record[String(header).trim()] = value || undefined
    }

    records.push(record)
  })

  return records
}

function readHtmlTableRecords(buffer: Buffer) {
  const html = buffer.toString('utf8')
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (match) => match[1],
  )

  if (rows.length === 0) {
    return readCsvRecords(buffer)
  }

  const table = rows.map((row) =>
    [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
      decodeHtml(stripTags(match[1]).trim()),
    ),
  )
  const [headers, ...bodyRows] = table

  if (!headers || headers.length === 0) {
    return []
  }

  return bodyRows
    .filter((row) => row.some(Boolean))
    .map((row) =>
      headers.reduce<CsvRecord>((record, header, index) => {
        if (header) {
          record[header] = row[index] || undefined
        }

        return record
      }, {}),
    )
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, '')
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

async function importContactRecords(records: CsvRecord[]) {
  const summary: ContactImportSummary = {
    totalRows: records.length,
    importedRows: 0,
    duplicateRows: 0,
    invalidRows: 0,
    rows: [],
  }

  const seenEmails = new Set<string>()
  const seenMobileNumbers = new Set<string>()

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2
    const parsed = csvContactRowSchema.safeParse({
      email: readColumn(record, emailColumns),
      fullName: readColumn(record, fullNameColumns),
      mobileNumber: readColumn(record, mobileColumns),
      commune: readColumn(record, communeColumns),
      country: readColumn(record, countryColumns),
      firstName: readColumn(record, firstNameColumns),
      lastName: readColumn(record, lastNameColumns),
    })

    if (!parsed.success) {
      summary.invalidRows += 1
      summary.rows.push({
        rowNumber,
        email: readColumn(record, emailColumns) ?? null,
        status: 'invalid',
        reason: 'Email ou numéro mobile manquant/invalide.',
      })
      continue
    }

    if (seenEmails.has(parsed.data.email)) {
      summary.duplicateRows += 1
      summary.rows.push({
        rowNumber,
        email: parsed.data.email,
        status: 'duplicate',
        reason: 'Duplicate email in uploaded file.',
      })
      continue
    }

    const normalizedMobileNumber = normalizeMobileNumber(parsed.data.mobileNumber)

    if (
      normalizedMobileNumber &&
      seenMobileNumbers.has(normalizedMobileNumber)
    ) {
      summary.duplicateRows += 1
      summary.rows.push({
        rowNumber,
        email: parsed.data.email,
        status: 'duplicate',
        reason: 'Duplicate mobile number in uploaded file.',
      })
      continue
    }

    seenEmails.add(parsed.data.email)

    if (normalizedMobileNumber) {
      seenMobileNumbers.add(normalizedMobileNumber)
    }

    const existingContact = await findContactByEmailOrMobile({
      email: parsed.data.email,
      mobileNumber: normalizedMobileNumber,
    })

    if (existingContact) {
      summary.duplicateRows += 1
      summary.rows.push({
        rowNumber,
        email: parsed.data.email,
        status: 'duplicate',
        reason:
          existingContact.email === parsed.data.email
            ? 'Contact email already exists.'
            : 'Contact mobile number already exists.',
      })
      continue
    }

    try {
      await createContact({
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        mobileNumber: normalizedMobileNumber ?? parsed.data.mobileNumber,
        commune: parsed.data.commune,
        country: parsed.data.country,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      })

      summary.importedRows += 1
      summary.rows.push({
        rowNumber,
        email: parsed.data.email,
        status: 'imported',
        reason: null,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Duplicate entry')) {
        summary.duplicateRows += 1
        summary.rows.push({
          rowNumber,
          email: parsed.data.email,
          status: 'duplicate',
          reason: 'Contact email or mobile number already exists.',
        })
        continue
      }

      throw error
    }
  }

  return summary
}

const emailColumns = [
  'adresse email',
  'Adresse email',
  'Adresse Email',
  'email',
  'Email',
  'EMAIL',
  'mail',
  'Mail',
]

const fullNameColumns = [
  'nom et prénoms',
  'Nom et prénoms',
  'nom et prenoms',
  'Nom et prenoms',
  'nom_prenoms',
  'fullName',
  'full_name',
  'nom complet',
  'Nom complet',
]

const mobileColumns = [
  'numéro mobile',
  'Numéro mobile',
  'numero mobile',
  'Numero mobile',
  'mobile',
  'Mobile',
  'telephone',
  'Téléphone',
  'tel',
]

const communeColumns = ['commune', 'Commune']
const countryColumns = ['pays', 'Pays', 'country', 'Country']
const firstNameColumns = ['firstName', 'first_name', 'prenom', 'Prénom', 'Prenom']
const lastNameColumns = ['lastName', 'last_name', 'nom', 'Nom']
