import { Router } from 'express'
import { z } from 'zod'
import { searchCommunes } from '../communes/index.js'

// Suggestions de communes officielles : publique, lecture seule, aucune donnée personnelle (spec 004).
export const communesRouter = Router()

const querySchema = z.object({ q: z.string().trim().min(2, 'Tapez au moins 2 caractères').max(60) })

communesRouter.get('/', (req, res) => {
  const { q } = querySchema.parse(req.query)
  res.json({ items: searchCommunes(q) })
})
