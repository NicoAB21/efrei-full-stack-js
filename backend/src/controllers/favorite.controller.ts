import type { Request, Response } from 'express'
import { objectIdParam } from '../schemas/common.js'
import { favoriteImportSchema } from '../schemas/favorite.js'
import * as favoriteService from '../services/favorite.service.js'

const currentUserId = (req: Request) => req.userId as string
const listingId = (req: Request) => objectIdParam.parse(req.params.id)

export async function list(req: Request, res: Response) {
  res.json({ items: await favoriteService.list(currentUserId(req)) })
}

export async function add(req: Request, res: Response) {
  await favoriteService.add(currentUserId(req), listingId(req))
  res.status(204).end()
}

export async function remove(req: Request, res: Response) {
  await favoriteService.remove(currentUserId(req), listingId(req))
  res.status(204).end()
}

export async function importMany(req: Request, res: Response) {
  const { listingIds } = favoriteImportSchema.parse(req.body)
  res.json({ items: await favoriteService.importMany(currentUserId(req), listingIds) })
}
