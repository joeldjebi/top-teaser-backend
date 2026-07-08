import { Router } from 'express'
import { activityLogsRouter } from '../modules/activity-logs/activity-logs.routes.js'
import { adminUsersRouter } from '../modules/admin-users/admin-users.routes.js'
import { authRouter } from '../modules/auth/auth.routes.js'
import { campaignsRouter } from '../modules/campaigns/campaigns.routes.js'
import { contactListsRouter } from '../modules/contact-lists/contact-lists.routes.js'
import { contactsRouter } from '../modules/contacts/contacts.routes.js'
import { communicationProvidersRouter } from '../modules/communication-providers/communication-providers.routes.js'
import { emailLogsRouter } from '../modules/email-logs/email-logs.routes.js'
import { importsRouter } from '../modules/imports/imports.routes.js'
import { locationsRouter } from '../modules/locations/locations.routes.js'
import { mailRouter } from '../modules/mail/mail.routes.js'
import { monitoringRouter } from '../modules/monitoring/monitoring.routes.js'
import { templatesRouter } from '../modules/templates/templates.routes.js'
import { technicalLogsRouter } from '../modules/technical-logs/technical-logs.routes.js'
import {
  suppressionsRouter,
  unsubscribesRouter,
} from '../modules/unsubscribes/unsubscribes.routes.js'
import { webhooksRouter } from '../modules/webhooks/webhooks.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/activity-logs', activityLogsRouter)
apiRouter.use('/admin-users', adminUsersRouter)
apiRouter.use('/contacts', contactsRouter)
apiRouter.use('/contact-lists', contactListsRouter)
apiRouter.use('/imports', importsRouter)
apiRouter.use('/locations', locationsRouter)
apiRouter.use('/templates', templatesRouter)
apiRouter.use('/campaigns', campaignsRouter)
apiRouter.use('/email-logs', emailLogsRouter)
apiRouter.use('/mail', mailRouter)
apiRouter.use('/communication-providers', communicationProvidersRouter)
apiRouter.use('/monitoring', monitoringRouter)
apiRouter.use('/technical-logs', technicalLogsRouter)
apiRouter.use('/webhooks', webhooksRouter)
apiRouter.use('/unsubscribes', unsubscribesRouter)
apiRouter.use('/suppressions', suppressionsRouter)
