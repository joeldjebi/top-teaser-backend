import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type {
  CreateEmailTemplateInput,
  EmailTemplate,
  UpdateEmailTemplateInput,
} from './templates.types.js'

type EmailTemplateRow = RowDataPacket & {
  id: number
  name: string
  subject: string
  html_content: string
  text_content: string | null
  created_at: Date
  updated_at: Date
}

function mapTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    htmlContent: row.html_content,
    textContent: row.text_content,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listTemplates(): Promise<EmailTemplate[]> {
  const [rows] = await db.execute<EmailTemplateRow[]>(
    `SELECT id, name, subject, html_content, text_content, created_at, updated_at
     FROM email_templates
     ORDER BY created_at DESC, id DESC`,
  )

  return rows.map(mapTemplate)
}

export async function findTemplateById(id: number): Promise<EmailTemplate | null> {
  const [rows] = await db.execute<EmailTemplateRow[]>(
    `SELECT id, name, subject, html_content, text_content, created_at, updated_at
     FROM email_templates
     WHERE id = ?
     LIMIT 1`,
    [id],
  )

  const template = rows[0]

  return template ? mapTemplate(template) : null
}

export async function createTemplate(
  input: CreateEmailTemplateInput,
): Promise<EmailTemplate> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO email_templates (name, subject, html_content, text_content)
     VALUES (?, ?, ?, ?)`,
    [input.name, input.subject, input.htmlContent, input.textContent ?? null],
  )

  const template = await findTemplateById(result.insertId)

  if (!template) {
    throw new Error('Template was created but could not be loaded.')
  }

  return template
}

export async function updateTemplate(
  id: number,
  input: UpdateEmailTemplateInput,
): Promise<EmailTemplate | null> {
  const fields: string[] = []
  const values: Array<string | null> = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }

  if (input.subject !== undefined) {
    fields.push('subject = ?')
    values.push(input.subject)
  }

  if (input.htmlContent !== undefined) {
    fields.push('html_content = ?')
    values.push(input.htmlContent)
  }

  if (input.textContent !== undefined) {
    fields.push('text_content = ?')
    values.push(input.textContent)
  }

  if (fields.length > 0) {
    await db.execute(
      `UPDATE email_templates
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, String(id)],
    )
  }

  return findTemplateById(id)
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM email_templates WHERE id = ?',
    [id],
  )

  return result.affectedRows > 0
}
