import { createHash, randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import { getMailSetting } from '../mail/mail-settings.service.js'
import { getMailProvider } from '../mail/providers/provider-registry.js'

export function generateInvitationToken() {
  return randomBytes(32).toString('base64url')
}

export function generateUnusablePassword() {
  return randomBytes(48).toString('base64url')
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function buildInvitationUrl(token: string) {
  return `${env.appUrl.replace(/\/$/, '')}/accept-invite?token=${token}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendAdminInvitation(input: {
  name: string
  email: string
  roleName: string
  invitationUrl: string
}) {
  const provider = await getMailProvider()
  const from = getMailSetting('MAIL_FROM') ?? env.mail.from
  const safeName = escapeHtml(input.name)
  const safeRoleName = escapeHtml(input.roleName)
  const safeInvitationUrl = escapeHtml(input.invitationUrl)

  return provider.send({
    from: {
      email: from,
      name: 'Top Teaser',
    },
    to: {
      email: input.email,
      name: input.name,
    },
    subject: 'Activez votre compte administrateur Top Teaser',
    html: `
      <!doctype html>
      <html>
        <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f6f8fb;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="padding:28px 32px;background:#111827;color:#ffffff;">
                      <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#86efac;">Top Teaser</div>
                      <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;">Votre accès administrateur est prêt</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;">
                      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">Bonjour ${safeName}, un accès administrateur vous a été créé avec le rôle <strong>${safeRoleName}</strong>.</p>
                      <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">Définissez votre mot de passe depuis ce lien sécurisé. Il expire dans 3 jours et ne peut être utilisé qu’une seule fois.</p>
                      <a href="${safeInvitationUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;padding:13px 18px;font-weight:800;">Définir mon mot de passe</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Bonjour ${input.name}, votre compte administrateur Top Teaser est prêt avec le rôle ${input.roleName}.\n\nDéfinissez votre mot de passe ici : ${input.invitationUrl}\n\nCe lien expire dans 3 jours et ne peut être utilisé qu’une seule fois.`,
    metadata: {
      type: 'admin-invitation',
    },
  })
}
