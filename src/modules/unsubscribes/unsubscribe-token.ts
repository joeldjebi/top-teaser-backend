import crypto from 'node:crypto'
import { env } from '../../config/env.js'

export function createUnsubscribeToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const signature = sign(normalizedEmail)

  return Buffer.from(`${normalizedEmail}.${signature}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string) {
  const decoded = Buffer.from(token, 'base64url').toString('utf8')
  const separatorIndex = decoded.lastIndexOf('.')

  if (separatorIndex === -1) {
    return null
  }

  const email = decoded.slice(0, separatorIndex)
  const signature = decoded.slice(separatorIndex + 1)
  const expectedSignature = sign(email)

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )
  ) {
    return null
  }

  return email
}

function sign(email: string) {
  return crypto
    .createHmac('sha256', env.auth.jwtSecret)
    .update(email)
    .digest('hex')
}
