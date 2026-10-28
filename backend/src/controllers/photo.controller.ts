import type { Request, Response } from 'express'
import { z } from 'zod'
import { objectIdParam } from '../schemas/common.js'
import * as photoService from '../services/photo.service.js'

const currentUserId = (req: Request) => req.userId as string
const listingId = (req: Request) => objectIdParam.parse(req.params.id)
const photoId = (req: Request) => z.uuid('identifiant de photo mal formé').parse(req.params.photoId)
const reorderSchema = z.strictObject({ order: z.array(z.uuid()).max(5) })

export async function add(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  res.status(201).json(await photoService.add(currentUserId(req), listingId(req), files))
}

export async function reorder(req: Request, res: Response) {
  const { order } = reorderSchema.parse(req.body)
  res.json(await photoService.reorder(currentUserId(req), listingId(req), order))
}

export async function remove(req: Request, res: Response) {
  res.json(await photoService.remove(currentUserId(req), listingId(req), photoId(req)))
}
