import { readFileSync } from 'node:fs'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { parse } from 'yaml'
import { z } from 'zod'
import { errorHandler, notFound } from './errors.js'
import { listingsRouter } from './routes/listings.js'
import { authRouter } from './routes/auth.js'
import { publicRouter } from './routes/public.js'
import { favoritesRouter } from './routes/favorites.js'
import { communesRouter } from './routes/communes.js'
import { uploadsDir } from './photos/storage.js'
import { paymentsConfig } from './config.js'
import { purchasesRouter } from './routes/purchases.js'
import { stripeWebhookRouter } from './routes/stripe-webhook.js'
import { messagesRouter } from './routes/messages.js'

const openapi = parse(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'))
z.config(z.locales.fr())

// Construit l'app sans ouvrir de port : server.ts l'écoute, les tests l'importent.
export function createApp() {
  const app = express()
  // Paiement de démonstration (spec 005) : absent si aucune clé Stripe de test n'est configurée
  const payments = paymentsConfig() !== null
  if (payments) app.use('/api/stripe/webhook', stripeWebhookRouter) // corps brut : avant express.json()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

  // Monter les routeurs des stories ici, par exemple :
  // app.use('/api/auth', authRouter)        (US1)
  // app.use('/api/listings', listingsRouter) (US2)
  app.use('/api/listings', listingsRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/public/listings', publicRouter)
  app.use('/api/favorites', favoritesRouter)
  app.use('/api/communes', communesRouter)
  if (payments) app.use('/api/purchases', purchasesRouter)
  app.use('/api/messages', messagesRouter)

  // Photos d'annonces : fichiers statiques, sans liste du dossier, jamais interprétés autrement qu'en image
  app.use(
    '/uploads',
    express.static(uploadsDir(), {
      index: false,
      maxAge: '30d',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  )

  app.use('/api', () => {
    throw notFound('Route inconnue')
  })
  app.use(errorHandler)

  return app
}
