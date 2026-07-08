import { Router } from 'express'
import { z } from 'zod'
import { logActivity } from '../activity-logs/activity-logs.repository.js'
import { requireAuth, requirePermission } from '../auth/auth.middleware.js'
import {
  createCommune,
  createCountry,
  deleteCommune,
  deleteCountry,
  findCountryById,
  listCountries,
  updateCommune,
  updateCountry,
} from './locations.repository.js'

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const countryIdParamSchema = z.object({
  countryId: z.coerce.number().int().positive(),
})

const countrySchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(12).nullable().optional(),
})

const updateCountrySchema = countrySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required.' },
)

const communeSchema = z.object({
  name: z.string().trim().min(1).max(120),
})

export const locationsRouter = Router()

locationsRouter.use(requireAuth)
locationsRouter.use(requirePermission('contacts', 'read'))

locationsRouter.get('/countries', async (_request, response) => {
  response.json({ data: await listCountries() })
})

locationsRouter.post(
  '/countries',
  requirePermission('contacts', 'create'),
  async (request, response) => {
    const parsed = countrySchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid country payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const country = await createCountry(parsed.data)
    await logActivity({
      actor: response.locals.user,
      action: 'create',
      resource: 'locations',
      resourceId: country?.id,
      message: `Pays créé : ${parsed.data.name}`,
    })

    response.status(201).json({ data: country })
  },
)

locationsRouter.patch(
  '/countries/:id',
  requirePermission('contacts', 'update'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)
    const body = updateCountrySchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid country update payload.' })
      return
    }

    const country = await updateCountry(params.data.id, body.data)

    if (!country) {
      response.status(404).json({ message: 'Country not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'locations',
      resourceId: country.id,
      message: `Pays modifié : ${country.name}`,
    })

    response.json({ data: country })
  },
)

locationsRouter.delete(
  '/countries/:id',
  requirePermission('contacts', 'delete'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid country id.' })
      return
    }

    const deleted = await deleteCountry(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Country not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'delete',
      resource: 'locations',
      resourceId: params.data.id,
      message: `Pays supprimé #${params.data.id}`,
    })

    response.status(204).send()
  },
)

locationsRouter.post(
  '/countries/:countryId/communes',
  requirePermission('contacts', 'create'),
  async (request, response) => {
    const params = countryIdParamSchema.safeParse(request.params)
    const body = communeSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid commune payload.' })
      return
    }

    const country = await findCountryById(params.data.countryId)

    if (!country) {
      response.status(404).json({ message: 'Country not found.' })
      return
    }

    const commune = await createCommune({
      countryId: params.data.countryId,
      name: body.data.name,
    })

    await logActivity({
      actor: response.locals.user,
      action: 'create',
      resource: 'locations',
      resourceId: commune?.id,
      message: `Commune créée : ${body.data.name}`,
      metadata: { countryId: params.data.countryId },
    })

    response.status(201).json({ data: commune })
  },
)

locationsRouter.patch(
  '/communes/:id',
  requirePermission('contacts', 'update'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)
    const body = communeSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid commune update payload.' })
      return
    }

    const commune = await updateCommune(params.data.id, body.data)

    if (!commune) {
      response.status(404).json({ message: 'Commune not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'locations',
      resourceId: commune.id,
      message: `Commune modifiée : ${commune.name}`,
    })

    response.json({ data: commune })
  },
)

locationsRouter.delete(
  '/communes/:id',
  requirePermission('contacts', 'delete'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid commune id.' })
      return
    }

    const deleted = await deleteCommune(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Commune not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'delete',
      resource: 'locations',
      resourceId: params.data.id,
      message: `Commune supprimée #${params.data.id}`,
    })

    response.status(204).send()
  },
)
