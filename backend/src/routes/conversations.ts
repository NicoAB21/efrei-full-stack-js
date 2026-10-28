import { Router } from 'express'
import * as conversationController from '../controllers/conversation.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const conversationsRouter = Router()

conversationsRouter.use(requireAuth)

conversationsRouter.get('/', conversationController.list)
conversationsRouter.get('/unread', conversationController.unread)
conversationsRouter.get('/:id', conversationController.get)
conversationsRouter.post('/:id/messages', conversationController.reply)
conversationsRouter.post('/:id/read', conversationController.markRead)
