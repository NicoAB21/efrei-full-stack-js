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
  status: Status
  createdAt: string
  updatedAt: string
  /** 0 à 5 photos, la première est la photo principale (spec 003) */
  photos: Photo[]
}
