import { Router } from 'express'
import * as favoriteController from '../controllers/favorite.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const favoritesRouter = Router()

favoritesRouter.use(requireAuth)

favoritesRouter.get('/', favoriteController.list)
favoritesRouter.post('/import', favoriteController.importMany)
favoritesRouter.put('/:id', favoriteController.add)
favoritesRouter.delete('/:id', favoriteController.remove)
