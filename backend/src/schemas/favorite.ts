import { z } from 'zod'
import { objectIdParam } from './common.js'

export const MAX_FAVORITES = 200

export const favoriteImportSchema = z.strictObject({
  listingIds: z.array(objectIdParam).max(MAX_FAVORITES),
})
