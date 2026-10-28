import type { Request, Response } from 'express'
import { objectIdParam } from '../schemas/common.js'
import { messageCreateSchema } from '../schemas/conversation.js'
import * as conversationService from '../services/conversation.service.js'

const currentUserId = (req: Request) => req.userId as string
const conversationId = (req: Request) => objectIdParam.parse(req.params.id)

/** POST /api/public/listings/:id/messages : premier contact depuis l'annonce */
export async function start(req: Request, res: Response) {
  const listingId = objectIdParam.parse(req.params.id)
  const { body } = messageCreateSchema.parse(req.body)
  res.status(201).json(await conversationService.start(currentUserId(req), listingId, body))
}

export async function list(req: Request, res: Response) {
  res.json({ items: await conversationService.list(currentUserId(req)) })
}

export async function unread(req: Request, res: Response) {
  res.json({ count: await conversationService.unreadCount(currentUserId(req)) })
}

export async function get(req: Request, res: Response) {
  res.json(await conversationService.get(currentUserId(req), conversationId(req)))
}

export async function reply(req: Request, res: Response) {
  const id = conversationId(req)
  const { body } = messageCreateSchema.parse(req.body)
  res.status(201).json(await conversationService.reply(currentUserId(req), id, body))
}

export async function markRead(req: Request, res: Response) {
  await conversationService.markRead(currentUserId(req), conversationId(req))
  res.status(204).end()
}
