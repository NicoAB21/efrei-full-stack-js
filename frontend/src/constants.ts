// Codes identiques au back-end (cf. data-model.md), libellés pour l'affichage.

export const CATEGORIES = {
  vehicules: 'Véhicules',
  immobilier: 'Immobilier',
  multimedia: 'Multimédia',
  maison: 'Maison',
  mode: 'Mode',
  loisirs: 'Loisirs',
  autre: 'Autre',
} as const

export const STATUSES = {
  available: 'Disponible',
  sold: 'Vendue',
} as const

export type Category = keyof typeof CATEGORIES
export type Status = keyof typeof STATUSES

export type Photo = { id: string; url: string; cardUrl: string; width: number; height: number }

export type Listing = {
  id: string
  ownerId: string
  title: string
  description: string
  priceCents: number
  category: Category
  city: string
  /** Commune officielle (spec 004) ; null pour une ancienne annonce en texte libre */
  cityCode: string | null
  postalCode: string | null
  status: Status
  createdAt: string
  updatedAt: string
  /** 0 à 5 photos, la première est la photo principale (spec 003) */
  photos: Photo[]
  /** Détail public : achat en ligne proposé (calculé par le serveur, spec 005) */
  buyable?: boolean
  /** Réponses privées du propriétaire : vente en ligne (spec 005) */
  soldOnline?: { at: string; priceCents: number }
}

export const PURCHASE_STATUSES = {
  pending: 'En attente de confirmation',
  confirmed: 'Confirmé',
  refunded: 'Annonce déjà vendue, remboursé',
  expired: 'Expiré',
} as const

export type Purchase = {
  id: string
  listingId: string
  listingTitle: string
  /** Vignette de la photo principale au moment de l'achat */
  listingPhotoUrl: string | null
  priceCents: number
  status: keyof typeof PURCHASE_STATUSES
  createdAt: string
  confirmedAt: string | null
}
