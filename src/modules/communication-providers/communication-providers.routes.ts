import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createCommunicationProvider,
  deleteCommunicationProvider,
  findCommunicationProviderById,
  listCommunicationProviders,
  updateCommunicationProvider,
} from './communication-providers.repository.js'
import {
  communicationProviderIdParamSchema,
  createCommunicationProviderSchema,
  updateCommunicationProviderSchema,
} from './communication-providers.schemas.js'

export const communicationProvidersRouter = Router()

communicationProvidersRouter.use(requireAuth)

communicationProvidersRouter.get('/', async (_request, response) => {
  response.json({
    data: await listCommunicationProviders(),
  })
})

communicationProvidersRouter.post('/', async (request, response) => {
  const parsed = createCommunicationProviderSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid communication provider payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  response.status(201).json({
    data: await createCommunicationProvider(parsed.data),
  })
})

communicationProvidersRouter.get('/:id', async (request, response) => {
  const parsed = communicationProviderIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid communication provider id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const provider = await findCommunicationProviderById(parsed.data.id)

  if (!provider) {
    response.status(404).json({
      message: 'Communication provider not found.',
    })
    return
  }

  response.json({ data: provider })
})

communicationProvidersRouter.patch('/:id', async (request, response) => {
  const params = communicationProviderIdParamSchema.safeParse(request.params)
  const body = updateCommunicationProviderSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid communication provider update payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const provider = await updateCommunicationProvider(params.data.id, body.data)

  if (!provider) {
    response.status(404).json({
      message: 'Communication provider not found.',
    })
    return
  }

  response.json({ data: provider })
})

communicationProvidersRouter.delete('/:id', async (request, response) => {
  const parsed = communicationProviderIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid communication provider id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const deleted = await deleteCommunicationProvider(parsed.data.id)

  if (!deleted) {
    response.status(404).json({
      message: 'Communication provider not found.',
    })
    return
  }

  response.status(204).send()
})
