import type { Request, Response } from 'express'
import { objectIdParam } from '../schemas/common.js'
import { listingCreateSchema, listingUpdateSchema } from '../schemas/listing.js'
import * as listingService from '../services/listing.service.js'

const currentUserId = (req: Request) => req.userId as string
const listingId = (req: Request) => objectIdParam.parse(req.params.id)

export async function list(req: Request, res: Response) {
  const items = await listingService.list(currentUserId(req))
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const listing = await listingService.get(currentUserId(req), listingId(req))
  res.json(listing)
}

export async function create(req: Request, res: Response) {
  const data = listingCreateSchema.parse(req.body)
  const listing = await listingService.create(currentUserId(req), data)
  res.status(201).json(listing)
}

export async function update(req: Request, res: Response) {
  const id = listingId(req)
  const data = listingUpdateSchema.parse(req.body)
  const listing = await listingService.update(currentUserId(req), id, data)
  res.json(listing)
}

export async function remove(req: Request, res: Response) {
  await listingService.remove(currentUserId(req), listingId(req))
  res.status(204).end()
}
