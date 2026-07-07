import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from './auth.middleware.js'
import { loginAdmin } from './auth.service.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authRouter = Router()

authRouter.post('/login', async (request, response) => {
  const parsed = loginSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid login payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const session = await loginAdmin(parsed.data.email, parsed.data.password)

  if (!session) {
    response.status(401).json({
      message: 'Invalid email or password.',
    })
    return
  }

  response.json({
    data: session,
  })
})

authRouter.post('/logout', requireAuth, (_request, response) => {
  response.json({
    message: 'Logged out successfully.',
  })
})

authRouter.get('/me', requireAuth, (_request, response) => {
  response.json({
    data: response.locals.user,
  })
})
