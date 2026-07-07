import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { findContactById } from '../contacts/contacts.repository.js'
import {
  addContactToList,
  createContactList,
  deleteContactList,
  findContactListById,
  listContactLists,
  removeContactFromList,
  updateContactList,
} from './contact-lists.repository.js'
import {
  addContactToListSchema,
  contactListContactParamSchema,
  contactListIdParamSchema,
  createContactListSchema,
  updateContactListSchema,
} from './contact-lists.schemas.js'

export const contactListsRouter = Router()

contactListsRouter.use(requireAuth)

contactListsRouter.get('/', async (_request, response) => {
  response.json({
    data: await listContactLists(),
  })
})

contactListsRouter.post('/', async (request, response) => {
  const parsed = createContactListSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact list payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const contactList = await createContactList(parsed.data)

  response.status(201).json({
    data: contactList,
  })
})

contactListsRouter.get('/:id', async (request, response) => {
  const parsed = contactListIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact list id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const contactList = await findContactListById(parsed.data.id)

  if (!contactList) {
    response.status(404).json({
      message: 'Contact list not found.',
    })
    return
  }

  response.json({
    data: contactList,
  })
})

contactListsRouter.patch('/:id', async (request, response) => {
  const params = contactListIdParamSchema.safeParse(request.params)
  const body = updateContactListSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid contact list update payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const contactList = await updateContactList(params.data.id, body.data)

  if (!contactList) {
    response.status(404).json({
      message: 'Contact list not found.',
    })
    return
  }

  response.json({
    data: contactList,
  })
})

contactListsRouter.delete('/:id', async (request, response) => {
  const parsed = contactListIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact list id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const deleted = await deleteContactList(parsed.data.id)

  if (!deleted) {
    response.status(404).json({
      message: 'Contact list not found.',
    })
    return
  }

  response.status(204).send()
})

contactListsRouter.post('/:id/contacts', async (request, response) => {
  const params = contactListIdParamSchema.safeParse(request.params)
  const body = addContactToListSchema.safeParse(request.body)

  if (!params.success || !body.success) {
    response.status(422).json({
      message: 'Invalid contact list attachment payload.',
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    })
    return
  }

  const contactList = await findContactListById(params.data.id)
  const contact = await findContactById(body.data.contactId)

  if (!contactList || !contact) {
    response.status(404).json({
      message: !contactList ? 'Contact list not found.' : 'Contact not found.',
    })
    return
  }

  const status = await addContactToList(params.data.id, body.data.contactId)

  response.status(status === 'attached' ? 201 : 200).json({
    data: await findContactListById(params.data.id),
    message:
      status === 'attached'
        ? 'Contact attached to list.'
        : 'Contact already attached to list.',
  })
})

contactListsRouter.delete('/:id/contacts/:contactId', async (request, response) => {
  const parsed = contactListContactParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid contact list detachment payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const removed = await removeContactFromList(
    parsed.data.id,
    parsed.data.contactId,
  )

  if (!removed) {
    response.status(404).json({
      message: 'Contact is not attached to this list.',
    })
    return
  }

  response.status(204).send()
})
