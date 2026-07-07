import { Router } from 'express'
import { authRouter } from '../modules/auth/auth.routes.js'
import { campaignsRouter } from '../modules/campaigns/campaigns.routes.js'
import { contactListsRouter } from '../modules/contact-lists/contact-lists.routes.js'
import { contactsRouter } from '../modules/contacts/contacts.routes.js'
import { emailLogsRouter } from '../modules/email-logs/email-logs.routes.js'
import { importsRouter } from '../modules/imports/imports.routes.js'
import { mailRouter } from '../modules/mail/mail.routes.js'
import { templatesRouter } from '../modules/templates/templates.routes.js'
import {
  suppressionsRouter,
  unsubscribesRouter,
} from '../modules/unsubscribes/unsubscribes.routes.js'
import { webhooksRouter } from '../modules/webhooks/webhooks.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/contacts', contactsRouter)
apiRouter.use('/contact-lists', contactListsRouter)
apiRouter.use('/imports', importsRouter)
apiRouter.use('/templates', templatesRouter)
apiRouter.use('/campaigns', campaignsRouter)
apiRouter.use('/email-logs', emailLogsRouter)
apiRouter.use('/mail', mailRouter)
apiRouter.use('/webhooks', webhooksRouter)
apiRouter.use('/unsubscribes', unsubscribesRouter)
apiRouter.use('/suppressions', suppressionsRouter)
