import { z } from 'zod'
import { objectIdParam } from './common.js'

export const CATEGORIES = ['vehicules', 'immobilier', 'multimedia', 'maison', 'mode', 'loisirs', 'autre'] as const
export const STATUSES = ['available', 'sold'] as const

export const listingCreateSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  category: z.enum(CATEGORIES),
  // Commune officielle + un de ses codes postaux ; le nom (city) est calculé par le serveur (spec 004)
  cityCode: z.string().regex(/^[0-9][0-9AB][0-9]{3}$/, 'code de commune mal formé'),
  postalCode: z.string().regex(/^[0-9]{5}$/, 'code postal mal formé'),
  status: z.enum(STATUSES).optional(),
})

export const listingUpdateSchema = listingCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Au moins un champ à modifier')
  .refine((data) => (data.cityCode === undefined) === (data.postalCode === undefined), {
    message: 'cityCode et postalCode vont ensemble',
    path: ['postalCode'],
  })

export type ListingCreateInput = z.infer<typeof listingCreateSchema>
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>

export const publicQuerySchema = z.strictObject({
  category: z.enum(CATEGORIES).optional(),
  city: z.string().trim().max(80).optional(),
  cityCode: z.string().regex(/^[0-9][0-9AB][0-9]{3}$/, 'code de commune mal formé').optional(),
  q: z.string().trim().max(100).optional(),
  ownerId: objectIdParam.optional(), // « autres annonces de ce vendeur » (ownerId est déjà public)
  sort: z.enum(['recent', 'price_asc', 'price_desc']).optional(),
  buyable: z.literal('1').optional(), // achat en ligne possible (spec 005)
  photos: z.literal('1').optional(), // avec au moins une photo
  page: z.string().pipe(z.coerce.number<string>().int().min(1).max(1000)).optional(),
  minPrice: z.string().pipe(z.coerce.number<string>().int().min(1).max(Number.MAX_SAFE_INTEGER)).optional(),
  maxPrice: z.string().pipe(z.coerce.number<string>().int().min(1).max(Number.MAX_SAFE_INTEGER)).optional(),
}).refine(
  ({ minPrice, maxPrice }) => minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
  { message: 'Le prix maximum doit être supérieur ou égal au prix minimum', path: ['maxPrice'] },
)

export type PublicQuery = z.infer<typeof publicQuerySchema>
