import { ApiError, apiFetch } from './api'
import type { Listing } from './constants'

export type ListingInput = Pick<Listing, 'title' | 'description' | 'priceCents' | 'category' | 'city' | 'status'>

const json = (method: string, data: object): RequestInit => ({ method, body: JSON.stringify(data) })

export const fetchMyListings = async () => (await apiFetch<{ items: Listing[] }>('/listings')).items

export const fetchListing = (id: string) => apiFetch<Listing>(`/listings/${id}`)

export const createListing = (data: ListingInput) => apiFetch<Listing>('/listings', json('POST', data))

export const updateListing = (id: string, data: Partial<ListingInput>) =>
  apiFetch<Listing>(`/listings/${id}`, json('PATCH', data))

export const deleteListing = (id: string) => apiFetch<void>(`/listings/${id}`, { method: 'DELETE' })

export function uploadPhotos(id: string, files: File[]) {
  const body = new FormData()
  for (const file of files) body.append('photos', file)
  return apiFetch<Listing>(`/listings/${id}/photos`, { method: 'POST', body })
}

export const reorderPhotos = (id: string, order: string[]) => apiFetch<Listing>(`/listings/${id}/photos`, json('PATCH', { order }))

export const deletePhoto = (id: string, photoId: string) => apiFetch<Listing>(`/listings/${id}/photos/${photoId}`, { method: 'DELETE' })

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Une erreur inattendue est survenue. Réessayez.'

// 404 = inexistante OU appartenant à un autre compte (l'API ne fait pas la différence) ; 400 = id mal formé
export const isNotFound = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 400)

export const loadErrorMessage = (error: unknown) =>
  isNotFound(error) ? 'Cette annonce est introuvable. Elle a peut-être été supprimée.' : errorMessage(error)
