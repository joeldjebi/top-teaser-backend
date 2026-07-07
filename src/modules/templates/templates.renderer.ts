import type { EmailTemplate, TemplateVariables } from './templates.types.js'

function renderString(value: string, variables: TemplateVariables) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    const replacement = variables[key]

    if (replacement === undefined || replacement === null) {
      return ''
    }

    return String(replacement)
  })
}

export function renderTemplate(
  template: EmailTemplate,
  variables: TemplateVariables,
) {
  return {
    subject: renderString(template.subject, variables),
    html: renderString(template.htmlContent, variables),
    text: template.textContent
      ? renderString(template.textContent, variables)
      : null,
  }
}
