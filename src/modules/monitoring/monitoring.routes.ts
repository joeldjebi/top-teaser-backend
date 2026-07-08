import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getMonitoringOverview } from './monitoring.repository.js'

export const monitoringRouter = Router()

monitoringRouter.use(requireAuth)

monitoringRouter.get('/', async (_request, response) => {
  response.json({
    data: await getMonitoringOverview(),
  })
})
