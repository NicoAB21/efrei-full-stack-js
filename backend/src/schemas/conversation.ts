import { z } from 'zod'

export const MAX_MESSAGE_LENGTH = 1000

export const messageCreateSchema = z.strictObject({
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})
