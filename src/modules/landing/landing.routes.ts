import { Router } from 'express'
import { logActivity } from '../activity-logs/activity-logs.repository.js'
import { requireAuth, requirePermission } from '../auth/auth.middleware.js'
import {
  createLandingChannel,
  createLandingPricingPackage,
  createLandingSectionItem,
  deleteLandingChannel,
  deleteLandingPricingPackage,
  deleteLandingSectionItem,
  getLandingContent,
  updateLandingChannel,
  updateLandingContact,
  updateLandingPage,
  updateLandingPricingPackage,
  updateLandingSection,
  updateLandingSectionItem,
} from './landing.repository.js'
import {
  createLandingChannelSchema,
  createLandingPricingPackageSchema,
  createLandingSectionItemSchema,
  landingIdParamSchema,
  landingSectionKeyParamSchema,
  updateLandingChannelSchema,
  updateLandingContactSchema,
  updateLandingPageSchema,
  updateLandingPricingPackageSchema,
  updateLandingSectionItemSchema,
  updateLandingSectionSchema,
} from './landing.schemas.js'

export const landingRouter = Router()

landingRouter.get('/', async (_request, response) => {
  const content = await getLandingContent()

  if (!content || !content.page.isPublished) {
    response.status(404).json({ message: 'Landing page not found.' })
    return
  }

  response.json({ data: content })
})

landingRouter.use('/admin', requireAuth, requirePermission('landing', 'read'))

landingRouter.get('/admin', async (_request, response) => {
  const content = await getLandingContent()

  if (!content) {
    response.status(404).json({ message: 'Landing page not found.' })
    return
  }

  response.json({ data: content })
})

landingRouter.patch(
  '/admin/page',
  requirePermission('landing', 'update'),
  async (request, response) => {
    const parsed = updateLandingPageSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid landing page payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const content = await updateLandingPage(parsed.data)
    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'landing',
      message: 'Landing page mise à jour.',
      metadata: parsed.data,
    })

    response.json({ data: content })
  },
)

landingRouter.patch(
  '/admin/sections/:sectionKey',
  requirePermission('landing', 'update'),
  async (request, response) => {
    const params = landingSectionKeyParamSchema.safeParse(request.params)
    const body = updateLandingSectionSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid landing section payload.' })
      return
    }

    const content = await updateLandingSection(params.data.sectionKey, body.data)

    if (!content) {
      response.status(404).json({ message: 'Landing section not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'landing',
      resourceId: params.data.sectionKey,
      message: `Section landing modifiée : ${params.data.sectionKey}`,
    })

    response.json({ data: content })
  },
)

landingRouter.post(
  '/admin/sections/:sectionKey/items',
  requirePermission('landing', 'create'),
  async (request, response) => {
    const params = landingSectionKeyParamSchema.safeParse(request.params)
    const body = createLandingSectionItemSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid landing item payload.' })
      return
    }

    const content = await createLandingSectionItem(params.data.sectionKey, body.data)

    if (!content) {
      response.status(404).json({ message: 'Landing section not found.' })
      return
    }

    response.status(201).json({ data: content })
  },
)

landingRouter.patch(
  '/admin/items/:id',
  requirePermission('landing', 'update'),
  async (request, response) => {
    const params = landingIdParamSchema.safeParse(request.params)
    const body = updateLandingSectionItemSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid landing item update payload.' })
      return
    }

    const content = await updateLandingSectionItem(params.data.id, body.data)

    if (!content) {
      response.status(404).json({ message: 'Landing item not found.' })
      return
    }

    response.json({ data: content })
  },
)

landingRouter.delete(
  '/admin/items/:id',
  requirePermission('landing', 'delete'),
  async (request, response) => {
    const params = landingIdParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid landing item id.' })
      return
    }

    const deleted = await deleteLandingSectionItem(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Landing item not found.' })
      return
    }

    response.status(204).send()
  },
)

landingRouter.post(
  '/admin/channels',
  requirePermission('landing', 'create'),
  async (request, response) => {
    const parsed = createLandingChannelSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid landing channel payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    response.status(201).json({ data: await createLandingChannel(parsed.data) })
  },
)

landingRouter.patch(
  '/admin/channels/:id',
  requirePermission('landing', 'update'),
  async (request, response) => {
    const params = landingIdParamSchema.safeParse(request.params)
    const body = updateLandingChannelSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid landing channel update payload.' })
      return
    }

    const content = await updateLandingChannel(params.data.id, body.data)

    if (!content) {
      response.status(404).json({ message: 'Landing channel not found.' })
      return
    }

    response.json({ data: content })
  },
)

landingRouter.delete(
  '/admin/channels/:id',
  requirePermission('landing', 'delete'),
  async (request, response) => {
    const params = landingIdParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid landing channel id.' })
      return
    }

    const deleted = await deleteLandingChannel(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Landing channel not found.' })
      return
    }

    response.status(204).send()
  },
)

landingRouter.post(
  '/admin/pricing-packages',
  requirePermission('landing', 'create'),
  async (request, response) => {
    const parsed = createLandingPricingPackageSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid pricing package payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    response.status(201).json({ data: await createLandingPricingPackage(parsed.data) })
  },
)

landingRouter.patch(
  '/admin/pricing-packages/:id',
  requirePermission('landing', 'update'),
  async (request, response) => {
    const params = landingIdParamSchema.safeParse(request.params)
    const body = updateLandingPricingPackageSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid pricing package update payload.' })
      return
    }

    const content = await updateLandingPricingPackage(params.data.id, body.data)

    if (!content) {
      response.status(404).json({ message: 'Pricing package not found.' })
      return
    }

    response.json({ data: content })
  },
)

landingRouter.delete(
  '/admin/pricing-packages/:id',
  requirePermission('landing', 'delete'),
  async (request, response) => {
    const params = landingIdParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid pricing package id.' })
      return
    }

    const deleted = await deleteLandingPricingPackage(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Pricing package not found.' })
      return
    }

    response.status(204).send()
  },
)

landingRouter.patch(
  '/admin/contact',
  requirePermission('landing', 'update'),
  async (request, response) => {
    const parsed = updateLandingContactSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid landing contact payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const content = await updateLandingContact(parsed.data)
    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'landing',
      message: 'Coordonnées landing mises à jour.',
    })

    response.json({ data: content })
  },
)
