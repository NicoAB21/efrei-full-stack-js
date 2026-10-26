import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { unauthorized } from '../errors.js'

// Exige `Authorization: Bearer <jwt>` valide et pose req.userId ; sinon 401.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? []
  if (scheme !== 'Bearer' || !token) throw unauthorized()

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'] })
    if (typeof payload === 'string' || !payload.sub) throw unauthorized()
    req.userId = payload.sub
  } catch {
    throw unauthorized('Session invalide ou expirée')
  }
  next()
}
