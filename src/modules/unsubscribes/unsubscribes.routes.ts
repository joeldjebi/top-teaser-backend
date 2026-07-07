import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createSuppression,
  deleteSuppression,
  listSuppressions,
  unsubscribeEmail,
} from './unsubscribes.repository.js'
import {
  createSuppressionSchema,
  suppressionIdParamSchema,
  unsubscribeSchema,
} from './unsubscribes.schemas.js'
import { verifyUnsubscribeToken } from './unsubscribe-token.js'

export const unsubscribesRouter = Router()
export const suppressionsRouter = Router()
export const publicUnsubscribeRouter = Router()

publicUnsubscribeRouter.get('/:token', async (request, response) => {
  const email = verifyUnsubscribeToken(request.params.token)

  if (!email) {
    response.status(400).send('Invalid unsubscribe link.')
    return
  }

  await unsubscribeEmail(email)
  response.send('You have been unsubscribed successfully.')
})

unsubscribesRouter.post('/', async (request, response) => {
  const parsed = unsubscribeSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid unsubscribe payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const email = parsed.data.token
    ? verifyUnsubscribeToken(parsed.data.token)
    : parsed.data.email

  if (!email) {
    response.status(400).json({
      message: 'Invalid unsubscribe token.',
    })
    return
  }

  await unsubscribeEmail(email)
  response.json({
    message: 'Unsubscribed successfully.',
  })
})

suppressionsRouter.use(requireAuth)

suppressionsRouter.get('/', async (_request, response) => {
  response.json({
    data: await listSuppressions(),
  })
})

suppressionsRouter.post('/', async (request, response) => {
  const parsed = createSuppressionSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid suppression payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  response.status(201).json({
    data: await createSuppression(parsed.data),
  })
})

suppressionsRouter.delete('/:id', async (request, response) => {
  const parsed = suppressionIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid suppression id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const deleted = await deleteSuppression(parsed.data.id)

  if (!deleted) {
    response.status(404).json({
      message: 'Suppression not found.',
    })
    return
  }

  response.status(204).send()
})
