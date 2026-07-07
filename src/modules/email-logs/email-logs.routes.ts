import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { findEmailLogById, listEmailLogs } from './email-logs.repository.js'
import { emailLogIdParamSchema } from './email-logs.schemas.js'

export const emailLogsRouter = Router()

emailLogsRouter.use(requireAuth)

emailLogsRouter.get('/', async (_request, response) => {
  response.json({
    data: await listEmailLogs(),
  })
})

emailLogsRouter.get('/:id', async (request, response) => {
  const parsed = emailLogIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid email log id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const emailLog = await findEmailLogById(parsed.data.id)

  if (!emailLog) {
    response.status(404).json({
      message: 'Email log not found.',
    })
    return
  }

  response.json({
    data: emailLog,
  })
})
