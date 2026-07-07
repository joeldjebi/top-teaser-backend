import { z } from 'zod'

export const emailLogIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
