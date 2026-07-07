import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../auth/auth.middleware.js'
import { createContactImportRecord, findContactImportById } from './imports.repository.js'
import { importIdParamSchema } from './imports.schemas.js'
import { importContactsFromFile } from './imports.service.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

export const importsRouter = Router()

importsRouter.use(requireAuth)

importsRouter.post('/contacts', upload.single('file'), async (request, response) => {
  if (!request.file) {
    response.status(422).json({
      message: 'Un fichier CSV ou Excel est requis.',
      errors: {
        file: ['Le champ file est requis.'],
      },
    })
    return
  }

  const summary = await importContactsFromFile({
    buffer: request.file.buffer,
    originalFilename: request.file.originalname,
    mimeType: request.file.mimetype,
  })
  const contactImport = await createContactImportRecord({
    originalFilename: request.file.originalname,
    status: 'completed',
    summary,
  })

  response.status(201).json({
    data: contactImport,
  })
})

importsRouter.get('/:id', async (request, response) => {
  const parsed = importIdParamSchema.safeParse(request.params)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid import id.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const contactImport = await findContactImportById(parsed.data.id)

  if (!contactImport) {
    response.status(404).json({
      message: 'Import not found.',
    })
    return
  }

  response.json({
    data: contactImport,
  })
})
