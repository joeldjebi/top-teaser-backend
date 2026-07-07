import { z } from 'zod'

export const contactListIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const contactListContactParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  contactId: z.coerce.number().int().positive(),
})

export const createContactListSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).nullable().optional(),
})

export const updateContactListSchema = createContactListSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })

export const addContactToListSchema = z.object({
  contactId: z.number().int().positive(),
})
