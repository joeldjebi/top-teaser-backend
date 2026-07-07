export type ContactImportStatus = 'completed' | 'failed'
export type ContactImportRowStatus = 'imported' | 'duplicate' | 'invalid'

export type ContactImportSummary = {
  totalRows: number
  importedRows: number
  duplicateRows: number
  invalidRows: number
  rows: Array<{
    rowNumber: number
    email: string | null
    status: ContactImportRowStatus
    reason: string | null
  }>
}

export type ContactImport = {
  id: number
  originalFilename: string
  status: ContactImportStatus
  totalRows: number
  importedRows: number
  duplicateRows: number
  invalidRows: number
  summary: ContactImportSummary | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type ImportContactRow = {
  email: string
  fullName?: string | null
  mobileNumber?: string | null
  commune?: string | null
  country?: string | null
  firstName?: string | null
  lastName?: string | null
}
