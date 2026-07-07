export type AuthenticatedUser = {
  id: number
  name: string
  email: string
  role: 'admin'
}

export type UserWithPassword = AuthenticatedUser & {
  passwordHash: string
}

export type AuthTokenPayload = {
  sub: string
  email: string
  role: 'admin'
}
