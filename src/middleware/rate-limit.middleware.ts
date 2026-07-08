import type { NextFunction, Request, Response } from 'express'
import { createTechnicalLog } from '../modules/technical-logs/technical-logs.repository.js'

type RateLimitOptions = {
  windowMs: number
  max: number
  scope: string
}

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(options: RateLimitOptions) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const key = `${options.scope}:${request.ip}`
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      })
      next()
      return
    }

    bucket.count += 1

    if (bucket.count > options.max) {
      response.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
      response.status(429).json({
        message: 'Trop de requêtes. Réessayez dans quelques instants.',
      })

      await createTechnicalLog({
        level: 'warning',
        scope: 'security',
        event: 'rate_limit_exceeded',
        message: `Rate limit dépassé sur ${options.scope}.`,
        payload: {
          ip: request.ip,
          method: request.method,
          path: request.originalUrl,
        },
      }).catch(() => undefined)
      return
    }

    next()
  }
}
