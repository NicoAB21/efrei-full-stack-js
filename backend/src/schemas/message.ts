import { z } from 'zod'

export const messageCreateSchema = z.strictObject({
  body: z.string().trim().min(1).max(1000),
})

export type MessageCreateInput = z.infer<typeof messageCreateSchema>
