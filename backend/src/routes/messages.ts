import { Router } from 'express'
import * as messageController from '../controllers/message.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const messagesRouter = Router()

messagesRouter.use(requireAuth)

messagesRouter.get('/', messageController.listReceived)
