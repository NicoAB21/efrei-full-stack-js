import { z } from 'zod'

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
}).strict()

export type Credentials = z.infer<typeof credentialsSchema>
