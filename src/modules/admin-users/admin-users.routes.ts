import { Router } from 'express'
import { logActivity } from '../activity-logs/activity-logs.repository.js'
import { requireAuth, requirePermission } from '../auth/auth.middleware.js'
import { createAdminInvitation } from './admin-invitations.repository.js'
import {
  buildInvitationUrl,
  generateInvitationToken,
  generateUnusablePassword,
  hashInvitationToken,
  sendAdminInvitation,
} from './admin-invitations.service.js'
import {
  countSuperAdmins,
  createAdminRole,
  createAdminUser,
  deleteAdminRole,
  deleteAdminUser,
  findAdminRoleById,
  findAdminUserById,
  listAdminRoles,
  listAdminUsers,
  updateAdminPassword,
  updateAdminRole,
  updateAdminUser,
} from './admin-users.repository.js'
import {
  createAdminSchema,
  createRoleSchema,
  idParamSchema,
  updateAdminSchema,
  updatePasswordSchema,
  updateRoleSchema,
} from './admin-users.schemas.js'

export const adminUsersRouter = Router()

adminUsersRouter.use(requireAuth)
adminUsersRouter.use(requirePermission('admins', 'read'))

adminUsersRouter.get('/roles', async (_request, response) => {
  response.json({ data: await listAdminRoles() })
})

adminUsersRouter.post(
  '/roles',
  requirePermission('admins', 'create'),
  async (request, response) => {
    const parsed = createRoleSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid role payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const role = await createAdminRole(parsed.data)
    await logActivity({
      actor: response.locals.user,
      action: 'create',
      resource: 'admin_roles',
      resourceId: role?.id,
      message: `Rôle admin créé : ${parsed.data.name}`,
      metadata: { permissions: parsed.data.permissions },
    })

    response.status(201).json({ data: role })
  },
)

adminUsersRouter.patch(
  '/roles/:id',
  requirePermission('admins', 'update'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)
    const body = updateRoleSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid role update payload.' })
      return
    }

    const role = await updateAdminRole(params.data.id, body.data)

    if (!role) {
      response.status(404).json({ message: 'Role not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'admin_roles',
      resourceId: role.id,
      message: `Rôle admin modifié : ${role.name}`,
      metadata: body.data,
    })

    response.json({ data: role })
  },
)

adminUsersRouter.delete(
  '/roles/:id',
  requirePermission('admins', 'delete'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid role id.' })
      return
    }

    const deleted = await deleteAdminRole(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Role not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'delete',
      resource: 'admin_roles',
      resourceId: params.data.id,
      message: `Rôle admin supprimé #${params.data.id}`,
    })

    response.status(204).send()
  },
)

adminUsersRouter.get('/', async (_request, response) => {
  response.json({ data: await listAdminUsers() })
})

adminUsersRouter.post(
  '/',
  requirePermission('admins', 'create'),
  async (request, response) => {
    const parsed = createAdminSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(422).json({
        message: 'Invalid admin payload.',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const role = await findAdminRoleById(parsed.data.roleId)

    if (!role) {
      response.status(404).json({ message: 'Role not found.' })
      return
    }

    const invitationToken = generateInvitationToken()
    const invitationUrl = buildInvitationUrl(invitationToken)
    const admin = await createAdminUser({
      ...parsed.data,
      password: generateUnusablePassword(),
    })

    if (!admin) {
      response.status(500).json({ message: 'Admin creation failed.' })
      return
    }

    await createAdminInvitation({
      userId: admin.id,
      tokenHash: hashInvitationToken(invitationToken),
    })

    let invitationEmailSent = false
    let invitationEmailError: string | null = null

    try {
      await sendAdminInvitation({
        name: admin.name,
        email: admin.email,
        roleName: role.name,
        invitationUrl,
      })
      invitationEmailSent = true
    } catch (error) {
      invitationEmailError =
        error instanceof Error ? error.message : 'Invitation email failed.'
    }

    await logActivity({
      actor: response.locals.user,
      action: 'create',
      resource: 'admin_users',
      resourceId: admin.id,
      message: `Admin créé : ${parsed.data.email}`,
      metadata: {
        roleId: parsed.data.roleId,
        roleName: role.name,
        invitationEmailSent,
        invitationEmailError,
      },
    })

    response.status(201).json({
      data: admin,
      invitationEmailSent,
      invitationUrl: invitationEmailSent ? undefined : invitationUrl,
      message: invitationEmailSent
        ? 'Admin créé. Le lien d’invitation a été envoyé par email.'
        : 'Admin créé. L’email d’invitation n’a pas pu être envoyé, utilisez le lien affiché une seule fois.',
    })
  },
)

adminUsersRouter.patch(
  '/:id',
  requirePermission('admins', 'update'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)
    const body = updateAdminSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid admin update payload.' })
      return
    }

    const admin = await updateAdminUser(params.data.id, body.data)

    if (!admin) {
      response.status(404).json({ message: 'Admin not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'update',
      resource: 'admin_users',
      resourceId: admin.id,
      message: `Admin modifié : ${admin.email}`,
      metadata: body.data,
    })

    response.json({ data: admin })
  },
)

adminUsersRouter.patch(
  '/:id/password',
  requirePermission('admins', 'update'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)
    const body = updatePasswordSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      response.status(422).json({ message: 'Invalid password payload.' })
      return
    }

    await updateAdminPassword(params.data.id, body.data.password)
    await logActivity({
      actor: response.locals.user,
      action: 'update_password',
      resource: 'admin_users',
      resourceId: params.data.id,
      message: `Mot de passe admin mis à jour #${params.data.id}`,
    })
    response.json({ message: 'Password updated.' })
  },
)

adminUsersRouter.delete(
  '/:id',
  requirePermission('admins', 'delete'),
  async (request, response) => {
    const params = idParamSchema.safeParse(request.params)

    if (!params.success) {
      response.status(422).json({ message: 'Invalid admin id.' })
      return
    }

    if (params.data.id === response.locals.user.id) {
      response.status(409).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' })
      return
    }

    const admin = await findAdminUserById(params.data.id)

    if (!admin) {
      response.status(404).json({ message: 'Admin not found.' })
      return
    }

    if (admin.role === 'super_admin' && (await countSuperAdmins()) <= 1) {
      response.status(409).json({
        message: 'Impossible de supprimer le seul super admin de la plateforme.',
      })
      return
    }

    const deleted = await deleteAdminUser(params.data.id)

    if (!deleted) {
      response.status(404).json({ message: 'Admin not found.' })
      return
    }

    await logActivity({
      actor: response.locals.user,
      action: 'delete',
      resource: 'admin_users',
      resourceId: params.data.id,
      message: `Admin supprimé #${params.data.id}`,
    })

    response.status(204).send()
  },
)
