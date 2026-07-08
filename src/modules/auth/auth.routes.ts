import { Router } from 'express'
import { z } from 'zod'
import { rateLimit } from '../../middleware/rate-limit.middleware.js'
import { requireAuth } from './auth.middleware.js'
import { getUserFromToken, loginAdmin } from './auth.service.js'
import { logActivity } from '../activity-logs/activity-logs.repository.js'
import {
  findValidAdminInvitationByTokenHash,
  markAdminInvitationAccepted,
} from '../admin-users/admin-invitations.repository.js'
import { hashInvitationToken } from '../admin-users/admin-invitations.service.js'
import {
  findAdminUserById,
  updateAdminPassword,
  updateAdminUser,
} from '../admin-users/admin-users.repository.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const profileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(190),
})

const passwordSchema = z.object({
  password: z.string().min(8).max(120),
})

const acceptInviteSchema = z.object({
  token: z.string().trim().min(32),
  password: z.string().min(8).max(120),
})

export const authRouter = Router()

authRouter.post(
  '/login',
  rateLimit({
    max: 8,
    scope: 'auth_login',
    windowMs: 15 * 60 * 1000,
  }),
  async (request, response) => {
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

  await logActivity({
    actor: session.user,
    action: 'login',
    resource: 'auth',
    resourceId: session.user.id,
    message: `Connexion admin : ${session.user.email}`,
  })

  response.json({
    data: session,
  })
  },
)

authRouter.post('/logout', requireAuth, async (_request, response) => {
  await logActivity({
    actor: response.locals.user,
    action: 'logout',
    resource: 'auth',
    resourceId: response.locals.user.id,
    message: `Déconnexion admin : ${response.locals.user.email}`,
  })

  response.json({
    message: 'Logged out successfully.',
  })
})

authRouter.post('/accept-invite', async (request, response) => {
  const parsed = acceptInviteSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid invitation payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const invitation = await findValidAdminInvitationByTokenHash(
    hashInvitationToken(parsed.data.token),
  )

  if (!invitation) {
    response.status(404).json({
      message: 'Ce lien d’invitation est invalide, expiré ou déjà utilisé.',
    })
    return
  }

  await updateAdminPassword(invitation.userId, parsed.data.password)
  const accepted = await markAdminInvitationAccepted(invitation.id)

  if (!accepted) {
    response.status(409).json({
      message: 'Ce lien d’invitation a déjà été utilisé.',
    })
    return
  }

  const admin = await findAdminUserById(invitation.userId)

  await logActivity({
    actor: admin
      ? { id: admin.id, name: admin.name, email: admin.email }
      : null,
    action: 'accept_invitation',
    resource: 'auth',
    resourceId: invitation.userId,
    message: `Invitation admin acceptée : ${admin?.email ?? `#${invitation.userId}`}`,
  })

  response.json({
    message: 'Invitation acceptée. Vous pouvez maintenant vous connecter.',
  })
})

authRouter.get('/me', requireAuth, (_request, response) => {
  response.json({
    data: response.locals.user,
  })
})

authRouter.patch('/me', requireAuth, async (request, response) => {
  const parsed = profileSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid profile payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  await updateAdminUser(response.locals.user.id, parsed.data)
  await logActivity({
    actor: response.locals.user,
    action: 'update_profile',
    resource: 'auth',
    resourceId: response.locals.user.id,
    message: `Profil admin mis à jour : ${parsed.data.email}`,
    metadata: {
      name: parsed.data.name,
      email: parsed.data.email,
    },
  })
  const authorization = request.header('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  response.json({
    data: await getUserFromToken(token),
  })
})

authRouter.patch('/me/password', requireAuth, async (request, response) => {
  const parsed = passwordSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(422).json({
      message: 'Invalid password payload.',
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  await updateAdminPassword(response.locals.user.id, parsed.data.password)
  await logActivity({
    actor: response.locals.user,
    action: 'update_password',
    resource: 'auth',
    resourceId: response.locals.user.id,
    message: `Mot de passe personnel mis à jour : ${response.locals.user.email}`,
  })
  response.json({ message: 'Password updated.' })
})
