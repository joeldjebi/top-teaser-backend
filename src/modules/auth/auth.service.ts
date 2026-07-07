import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { findUserByEmail, findUserById } from './auth.repository.js'
import type {
  AuthenticatedUser,
  AuthTokenPayload,
  UserWithPassword,
} from './auth.types.js'

function sanitizeUser(user: UserWithPassword): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function loginAdmin(email: string, password: string) {
  const user = await findUserByEmail(email)

  if (!user) {
    return null
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)

  if (!passwordMatches) {
    return null
  }

  const payload: AuthTokenPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
  }

  const signOptions: SignOptions = {
    expiresIn: env.auth.jwtExpiresIn as SignOptions['expiresIn'],
  }

  const token = jwt.sign(payload, env.auth.jwtSecret, signOptions)

  return {
    token,
    user: sanitizeUser(user),
  }
}

export async function getUserFromToken(token: string) {
  const payload = jwt.verify(token, env.auth.jwtSecret) as AuthTokenPayload
  const user = await findUserById(Number(payload.sub))

  if (!user) {
    return null
  }

  return sanitizeUser(user)
}
