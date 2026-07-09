import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../auth/auth.middleware.js'
import { clearActivityLogs, listActivityLogs } from './activity-logs.repository.js'

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const activityLogsRouter = Router()

activityLogsRouter.use(requireAuth)
activityLogsRouter.use(requirePermission('logs', 'read'))

activityLogsRouter.get('/', async (request, response) => {
  const parsed = querySchema.safeParse(request.query)

  if (!parsed.success) {
    response.status(422).json({ message: 'Invalid activity logs query.' })
    return
  }

  response.json({
    data: await listActivityLogs(parsed.data.limit),
  })
})

activityLogsRouter.delete('/', requirePermission('logs', 'delete'), async (_request, response) => {
  response.json({
    data: await clearActivityLogs(),
  })
})
