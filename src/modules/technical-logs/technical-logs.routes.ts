import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { listTechnicalLogs } from './technical-logs.repository.js'

export const technicalLogsRouter = Router()

technicalLogsRouter.use(requireAuth)

technicalLogsRouter.get('/', async (request, response) => {
  const limit = Number(request.query.limit ?? 300)

  response.json({
    data: await listTechnicalLogs(Number.isFinite(limit) ? limit : 300),
  })
})
