import { z } from 'zod'
import { objectIdParam } from './common.js'

// Achat en ligne proposé jusqu'à 10 000 € et hors Immobilier / Véhicules (spec 005, FR-001)
export const MAX_BUYABLE_CENTS = 1_000_000
export const NOT_BUYABLE_CATEGORIES: readonly string[] = ['immobilier', 'vehicules']

export const isBuyable = (listing: { category: string; priceCents: number }) =>
  !NOT_BUYABLE_CATEGORIES.includes(listing.category) && listing.priceCents <= MAX_BUYABLE_CENTS

// Seul l'identifiant de l'annonce : le prix est lu en base (FR-003)
export const purchaseCreateSchema = z.strictObject({ listingId: objectIdParam })
