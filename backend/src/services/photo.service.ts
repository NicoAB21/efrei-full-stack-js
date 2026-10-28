import { invalidInput, notFound } from '../errors.js'
import { Listing, MAX_PHOTOS } from '../models/listing.js'
import { processPhoto } from '../photos/process.js'
import { deletePhotoFiles, savePhoto, type StoredPhoto } from '../photos/storage.js'

// Toutes les opérations filtrent { _id, ownerId } : l'annonce d'un autre compte = 404 (comme US3).

type Upload = { buffer: Buffer; originalname: string }

async function findOwned(userId: string, listingId: string) {
  const listing = await Listing.findOne({ _id: listingId, ownerId: userId })
  if (!listing) throw notFound('Annonce introuvable')
  return listing
}

/** Tout ou rien : chaque photo est vérifiée et traitée AVANT d'écrire le moindre fichier. */
export async function add(userId: string, listingId: string, files: Upload[]) {
  if (files.length === 0) throw invalidInput('Ajoutez au moins une photo (champ photos)')
  const listing = await findOwned(userId, listingId)
  if (listing.photos.length + files.length > MAX_PHOTOS) {
    throw invalidInput(`${MAX_PHOTOS} photos maximum par annonce (déjà ${listing.photos.length})`)
  }
  const processed = []
  for (const file of files) processed.push(await processPhoto(file.buffer, file.originalname))

  const stored: StoredPhoto[] = []
  try {
    for (const photo of processed) stored.push(await savePhoto(photo))
    const updated = await Listing.findOneAndUpdate(
      { _id: listingId, ownerId: userId, [`photos.${MAX_PHOTOS - stored.length}`]: { $exists: false } },
      { $push: { photos: { $each: stored } } },
      { new: true },
    )
    if (!updated) throw invalidInput(`${MAX_PHOTOS} photos maximum par annonce`)
    return updated
  } catch (err) {
    await Promise.all(stored.map((p) => deletePhotoFiles(p.id))) // pas de fichier orphelin
    throw err
  }
}

/** `order` doit être une permutation exacte des ids existants ; la première devient principale. */
export async function reorder(userId: string, listingId: string, order: string[]) {
  const listing = await findOwned(userId, listingId)
  const current = listing.photos.map((p) => p.id)
  const isPermutation = order.length === current.length && new Set(order).size === order.length && order.every((id) => current.includes(id))
  if (!isPermutation) throw invalidInput('Ordre invalide : indiquez chaque photo une seule fois')
  const byId = new Map(listing.photos.map((p) => [p.id, p.toObject()]))
  listing.photos.splice(0, listing.photos.length, ...order.map((id) => byId.get(id)!))
  await listing.save()
  return listing
}

export async function remove(userId: string, listingId: string, photoId: string) {
  const listing = await findOwned(userId, listingId)
  if (!listing.photos.some((p) => p.id === photoId)) throw notFound('Photo introuvable')
  const updated = await Listing.findOneAndUpdate({ _id: listingId, ownerId: userId }, { $pull: { photos: { id: photoId } } }, { new: true })
  await deletePhotoFiles(photoId)
  return updated
}
