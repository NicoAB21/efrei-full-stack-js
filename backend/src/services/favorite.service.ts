import { invalidInput, notFound } from '../errors.js'
import { Favorite } from '../models/favorite.js'
import { Listing } from '../models/listing.js'
import { MAX_FAVORITES } from '../schemas/favorite.js'

// Toutes les requêtes filtrent sur userId : on ne lit et ne modifie que SES favoris (isolation, comme US3).

const publicFields = 'title description priceCents category city status createdAt updatedAt ownerId photos'

/** Favoris du plus récent au plus ancien ; annonce supprimée = écartée, vendue = gardée (status "sold"). */
export async function list(userId: string) {
  const favorites = await Favorite.find({ userId }).sort({ createdAt: -1, _id: -1 })
  const listings = await Listing.find({ _id: { $in: favorites.map((f) => f.listingId) } }).select(publicFields)
  const byId = new Map(listings.map((l) => [String(l._id), l]))
  return favorites.flatMap((f) => {
    const listing = byId.get(String(f.listingId))
    return listing ? [{ ...listing.toJSON(), favoritedAt: f.createdAt }] : []
  })
}

export async function add(userId: string, listingId: string) {
  const listing = await Listing.findOne({ _id: listingId, status: 'available' })
  if (!listing) throw notFound('Annonce introuvable')
  if (String(listing.ownerId) === userId) throw invalidInput('Vous ne pouvez pas mettre votre propre annonce en favori')
  if (await Favorite.exists({ userId, listingId })) return // idempotent
  if ((await Favorite.countDocuments({ userId })) >= MAX_FAVORITES) {
    throw invalidInput(`${MAX_FAVORITES} favoris maximum : retirez-en un pour en ajouter un autre`)
  }
  try {
    await Favorite.create({ userId, listingId })
  } catch (err) {
    // Double clic simultané : l'index unique a déjà enregistré le favori
    if ((err as { code?: number }).code !== 11000) throw err
  }
}

export async function remove(userId: string, listingId: string) {
  const { deletedCount } = await Favorite.deleteOne({ userId, listingId })
  if (deletedCount === 0) throw notFound('Favori introuvable')
}

/** Reprise des favoris du navigateur : ignore ce qui n'est pas ajoutable, s'arrête à la limite. Renvoie les ids importés. */
export async function importMany(userId: string, listingIds: string[]) {
  const wanted = [...new Set(listingIds)]
  const room = MAX_FAVORITES - (await Favorite.countDocuments({ userId }))
  if (room <= 0 || wanted.length === 0) return []

  const eligible = await Listing.find({ _id: { $in: wanted }, status: 'available', ownerId: { $ne: userId } }).select('_id')
  const already = await Favorite.find({ userId, listingId: { $in: wanted } }).select('listingId')
  const eligibleIds = new Set(eligible.map((l) => String(l._id)))
  const alreadyIds = new Set(already.map((f) => String(f.listingId)))

  const toImport = wanted.filter((id) => eligibleIds.has(id) && !alreadyIds.has(id)).slice(0, room)
  await Favorite.insertMany(toImport.map((listingId) => ({ userId, listingId })))
  return toImport
}
