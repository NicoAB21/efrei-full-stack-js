import { Router } from 'express'
import multer from 'multer'
import * as listingController from '../controllers/listing.controller.js'
import * as photoController from '../controllers/photo.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const listingsRouter = Router()

listingsRouter.use(requireAuth)

listingsRouter.get('/', listingController.list)
listingsRouter.post('/', listingController.create)
listingsRouter.get('/:id', listingController.get)
listingsRouter.patch('/:id', listingController.update)
listingsRouter.delete('/:id', listingController.remove)

// Photos (spec 003) : fichiers gardés en mémoire le temps d'être vérifiés et ré-encodés
const photosUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5 } }).array('photos', 5)

listingsRouter.post('/:id/photos', photosUpload, photoController.add)
listingsRouter.patch('/:id/photos', photoController.reorder)
listingsRouter.delete('/:id/photos/:photoId', photoController.remove)
