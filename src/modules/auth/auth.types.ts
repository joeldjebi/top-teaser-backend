export type CrudPermission = {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export type PermissionResource =
  | 'overview'
  | 'contacts'
  | 'contactLists'
  | 'templates'
  | 'campaigns'
  | 'logs'
  | 'providers'
  | 'admins'

export type PermissionMatrix = Record<PermissionResource, CrudPermission>

export type AuthenticatedUser = {
  id: number
  name: string
  email: string
  role: 'admin' | 'super_admin'
  roleId: number | null
  roleName: string
  permissions: PermissionMatrix
}

export type UserWithPassword = Omit<AuthenticatedUser, 'permissions'> & {
  passwordHash: string
  permissions: PermissionMatrix | null
}

export type AuthTokenPayload = {
  sub: string
  email: string
  role: 'admin' | 'super_admin'
}
