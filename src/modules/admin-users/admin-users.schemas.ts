import { z } from 'zod'

const crudSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
})

export const permissionMatrixSchema = z.object({
  overview: crudSchema,
  contacts: crudSchema,
  contactLists: crudSchema,
  templates: crudSchema,
  campaigns: crudSchema,
  logs: crudSchema,
  providers: crudSchema,
  landing: crudSchema,
  admins: crudSchema,
})

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).nullable().optional(),
  permissions: permissionMatrixSchema,
})

export const updateRoleSchema = createRoleSchema.partial()

export const createAdminSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(190),
  roleId: z.number().int().positive(),
})

export const updateAdminSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().max(190).optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8).max(120),
})
