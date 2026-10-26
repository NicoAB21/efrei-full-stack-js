import { readFileSync } from 'node:fs'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { parse } from 'yaml'
import { errorHandler, notFound } from './errors.js'

const openapi = parse(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'))

// Construit l'app sans ouvrir de port : server.ts l'écoute, les tests l'importent.
export function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

  // Monter les routeurs des stories ici, par exemple :
  // app.use('/api/auth', authRouter)        (US1)
  // app.use('/api/listings', listingsRouter) (US2)

  app.use('/api', () => {
    throw notFound('Route inconnue')
  })
  app.use(errorHandler)

  return app
}
