import { Router } from 'express'
import { objectIdParam } from '../schemas/common.js'
import { publicQuerySchema } from '../schemas/listing.js'
import { getPublic, listPublic } from '../services/listing.service.js'

export const publicRouter = Router()

publicRouter.get('/', async (req, res) => {
  res.json({ items: await listPublic(publicQuerySchema.parse(req.query)) })
})

publicRouter.get('/:id', async (req, res) => {
  res.json(await getPublic(objectIdParam.parse(req.params.id)))
})
