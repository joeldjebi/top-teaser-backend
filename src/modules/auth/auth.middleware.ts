import type { NextFunction, Request, Response } from 'express'
import { getUserFromToken } from './auth.service.js'

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.header('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null

  if (!token) {
    response.status(401).json({
      message: 'Authentication token is required.',
    })
    return
  }

  try {
    const user = await getUserFromToken(token)

    if (!user) {
      response.status(401).json({
        message: 'Invalid authentication token.',
      })
      return
    }

    response.locals.user = user
    next()
  } catch {
    response.status(401).json({
      message: 'Invalid authentication token.',
    })
  }
}
