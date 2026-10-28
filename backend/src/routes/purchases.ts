import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { purchaseCreateSchema } from '../schemas/purchase.js'
import * as purchaseService from '../services/purchase.service.js'

export const purchasesRouter = Router()

purchasesRouter.use(requireAuth)

purchasesRouter.get('/', async (req, res) => {
  res.json({ items: await purchaseService.list(req.userId as string) })
})

purchasesRouter.post('/', async (req, res) => {
  const { listingId } = purchaseCreateSchema.parse(req.body)
  res.status(201).json({ url: await purchaseService.start(req.userId as string, listingId) })
})
