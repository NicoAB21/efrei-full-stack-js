import express from 'express'

// Construit l'app sans ouvrir de port : server.ts l'écoute, les tests l'importent.
export function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  return app
}
