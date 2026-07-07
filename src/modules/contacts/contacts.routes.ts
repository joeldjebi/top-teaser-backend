import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  contactIdParamSchema,
  createContactSchema,
  updateContactSchema,
} from './contacts.schemas.js'
import {
  createContact,
  deleteContact,
  findContactById,
  listContacts,
  updateContact,
} from './contacts.repository.js'

export const contactsRouter = Router()

function duplicateContactMessage(error: Error) {
  if (error.message.includes('mobile')) {
    return 'A contact with this mobile number already exists.'
  }

  return 'A contact with this email or mobile number already exists.'
}

contactsRouter.use(requireAuth)

contactsRouter.get('/', async (_request, response) => {
  const contacts = await listContacts()

  response.json({
    data: contacts,
  })
})

contactsRouter.post('/', async (request, response) => {
  const parsed = createContactSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  try {
    const contact = await createContact(parsed.data)

    response.status(201).json({
      data: contact,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      response.status(409).json({
        message: duplicateContactMessage(error),
      })
      return
    }

    throw error
  }
})

contactsRouter.get('/:id', async (request, response) => {
  const parsed = contactIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const contact = await findContactById(parsed.data.id)

  if (!contact) {
    response.status(404).json({
      message: 'Contact not found.',
    })
    return
  }

  response.json({
    data: contact,
  })
})

contactsRouter.patch('/:id', async (request, response) => {
  const params = contactIdParamSchema.safeParse(request.params)
  const body = updateContactSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid contact update payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  try {
    const contact = await updateContact(params.data.id, body.data)

    if (!contact) {
      response.status(404).json({
        message: 'Contact not found.',
      })
      return
    }

    response.json({
      data: contact,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      response.status(409).json({
        message: duplicateContactMessage(error),
      })
      return
    }

    throw error
  }
})

contactsRouter.delete('/:id', async (request, response) => {
  const parsed = contactIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const deleted = await deleteContact(parsed.data.id)

  if (!deleted) {
    response.status(404).json({
      message: 'Contact not found.',
    })
    return
  }

  response.status(204).send()
})
