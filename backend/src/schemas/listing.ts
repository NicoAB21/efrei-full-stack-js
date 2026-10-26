import { z } from 'zod'

export const CATEGORIES = ['vehicules', 'immobilier', 'multimedia', 'maison', 'mode', 'loisirs', 'autre'] as const
export const STATUSES = ['available', 'sold'] as const

export const listingCreateSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  category: z.enum(CATEGORIES),
  city: z.string().trim().min(1).max(80),
  status: z.enum(STATUSES).optional(),
})

export const listingUpdateSchema = listingCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Au moins un champ à modifier')

export type ListingCreateInput = z.infer<typeof listingCreateSchema>
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>

export const publicQuerySchema = z.strictObject({
  category: z.enum(CATEGORIES).optional(),
  city: z.string().trim().max(80).optional(),
  q: z.string().trim().max(100).optional(),
  minPrice: z.string().pipe(z.coerce.number<string>().int().min(1).max(Number.MAX_SAFE_INTEGER)).optional(),
  maxPrice: z.string().pipe(z.coerce.number<string>().int().min(1).max(Number.MAX_SAFE_INTEGER)).optional(),
}).refine(
  ({ minPrice, maxPrice }) => minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
  { message: 'Le prix maximum doit être supérieur ou égal au prix minimum', path: ['maxPrice'] },
)

export type PublicQuery = z.infer<typeof publicQuerySchema>
