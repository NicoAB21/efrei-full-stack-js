import { Router } from 'express'
import * as listingController from '../controllers/listing.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const listingsRouter = Router()

listingsRouter.use(requireAuth)

listingsRouter.get('/', listingController.list)
listingsRouter.post('/', listingController.create)
listingsRouter.get('/:id', listingController.get)
listingsRouter.patch('/:id', listingController.update)
listingsRouter.delete('/:id', listingController.remove)
