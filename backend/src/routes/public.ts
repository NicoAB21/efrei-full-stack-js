import { Router } from 'express'
import { paymentsConfig } from '../config.js'
import { isBuyable } from '../schemas/purchase.js'
import { objectIdParam } from '../schemas/common.js'
import { publicQuerySchema } from '../schemas/listing.js'
import { getPublic, listPublic } from '../services/listing.service.js'

export const publicRouter = Router()

publicRouter.get('/', async (req, res) => {
  res.json(await listPublic(publicQuerySchema.parse(req.query)))
})

publicRouter.get('/:id', async (req, res) => {
  const listing = await getPublic(objectIdParam.parse(req.params.id))
  // Le serveur décide seul si « Acheter » est proposé (spec 005) ; le front n'ajoute que « pas sa propre annonce »
  res.json({ ...listing.toJSON(), buyable: paymentsConfig() !== null && isBuyable(listing) })
})
