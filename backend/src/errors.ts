import type { ErrorRequestHandler } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'

export type ErrorCode = 'INVALID_INPUT' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'EMAIL_ALREADY_USED' | 'PAYMENT_UNAVAILABLE'

// À lever n'importe où (service, contrôleur, middleware) : le handler la formate.
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export const invalidInput = (message = 'Entrée invalide') => new HttpError(400, 'INVALID_INPUT', message)
export const unauthorized = (message = 'Authentification requise') => new HttpError(401, 'UNAUTHORIZED', message)
export const notFound = (message = 'Ressource introuvable') => new HttpError(404, 'NOT_FOUND', message)
export const paymentUnavailable = () => new HttpError(502, 'PAYMENT_UNAVAILABLE', 'Paiement indisponible, réessayez plus tard')

// Erreurs de réception des photos (multer) → 400 lisible
const MULTER_MESSAGES: Partial<Record<MulterError['code'], string>> = {
  LIMIT_FILE_SIZE: 'Photo trop lourde : 5 Mo maximum',
  LIMIT_FILE_COUNT: '5 photos maximum par envoi',
  LIMIT_UNEXPECTED_FILE: 'Champ de fichier attendu : photos',
}

// Toute erreur sort au format {"error":{"code","message"}}.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const issue = err.issues[0]
    const field = issue.path.join('.')
    err = invalidInput(field ? `${field} : ${issue.message}` : issue.message)
  } else if (err instanceof MulterError) {
    err = invalidInput(MULTER_MESSAGES[err.code] ?? 'Envoi de fichiers invalide')
  } else if (err?.type === 'entity.parse.failed') {
    err = invalidInput('Corps JSON mal formé')
  } else if (err?.type && err.status >= 400 && err.status < 500) {
    err = invalidInput('Corps de requête invalide ou trop volumineux')
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }

  console.error(err)
  // Jamais de détail interne vers le client.
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } })
}
