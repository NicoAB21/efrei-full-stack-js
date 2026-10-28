import type { Request, Response } from 'express'
import { objectIdParam } from '../schemas/common.js'
import { messageCreateSchema } from '../schemas/message.js'
import * as messageService from '../services/message.service.js'

const currentUserId = (req: Request) => req.userId as string

export async function send(req: Request, res: Response) {
  const listingId = objectIdParam.parse(req.params.id)
  const data = messageCreateSchema.parse(req.body)
  const message = await messageService.send(currentUserId(req), listingId, data)
  res.status(201).json(message)
}

export async function listReceived(req: Request, res: Response) {
  res.json({ items: await messageService.listReceived(currentUserId(req)) })
}
