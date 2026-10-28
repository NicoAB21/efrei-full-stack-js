import { checkLocation, normalize } from '../communes/index.js'
import { invalidInput, notFound } from '../errors.js'
import { Favorite } from '../models/favorite.js'
import { deletePhotoFiles } from '../photos/storage.js'
import { Listing } from '../models/listing.js'
import type { ListingCreateInput, ListingUpdateInput } from '../schemas/listing.js'
import type { PublicQuery } from '../schemas/listing.js'

const notFoundListing = () => notFound('Annonce introuvable')

export async function list(ownerId: string) {
  return Listing.find({ ownerId }).sort({ createdAt: -1, _id: -1 })
}

export async function get(ownerId: string, id: string) {
  const listing = await Listing.findOne({ _id: id, ownerId })
  if (!listing) throw notFoundListing()
  return listing
}

/** Commune officielle vérifiée → champs enregistrés (nom officiel + clé de recherche). */
function location(cityCode: string, postalCode: string) {
  const commune = checkLocation(cityCode, postalCode)
  if (!commune) throw invalidInput('Commune ou code postal inconnu : choisissez une commune dans la liste')
  return { cityCode, postalCode, city: commune.name, cityKey: normalize(commune.name) }
}

export async function create(ownerId: string, data: ListingCreateInput) {
  const { cityCode, postalCode, ...rest } = data
  return Listing.create({ ...rest, ...location(cityCode, postalCode), ownerId })
}

export async function update(ownerId: string, id: string, data: ListingUpdateInput) {
  const { cityCode, postalCode, ...rest } = data
  const changes: Record<string, unknown> = { ...rest }
  if (cityCode && postalCode) {
    Object.assign(changes, location(cityCode, postalCode))
  } else if (Object.keys(rest).some((key) => key !== 'status')) {
    // Ancienne annonce en texte libre : on exige une commune dès qu'on la modifie (hors simple statut)
    const current = await Listing.findOne({ _id: id, ownerId }).select('cityCode')
    if (!current) throw notFoundListing()
    if (!current.cityCode) throw invalidInput('Choisissez la commune de cette annonce dans la liste')
  }
  const listing = await Listing.findOneAndUpdate({ _id: id, ownerId }, changes, { new: true })
  if (!listing) throw notFoundListing()
  return listing
}

export async function remove(ownerId: string, id: string) {
  const listing = await Listing.findOneAndDelete({ _id: id, ownerId })
  if (!listing) throw notFoundListing()
  await Favorite.deleteMany({ listingId: id }) // une annonce supprimée disparaît des favoris
  await Promise.all(listing.photos.map((photo) => deletePhotoFiles(photo.id)))
}

const literalPattern = (value: string) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

// Projection explicite : aucune jointure avec les données du vendeur.
const publicFields = 'title description priceCents category city cityCode postalCode status createdAt updatedAt ownerId photos'

export async function listPublic(filters: PublicQuery) {
  const query = Listing.find({ status: 'available' }).select(publicFields)
  if (filters.category) query.where('category').equals(filters.category)
  if (filters.cityCode) query.where('cityCode').equals(filters.cityCode)
  // Nom de commune : toutes ses annonces (tous codes postaux) ; repli sur le texte des anciennes annonces
  if (filters.city) query.and([{ $or: [{ cityKey: normalize(filters.city) }, { cityCode: null, city: literalPattern(filters.city) }] }])
  if (filters.q) {
    const pattern = literalPattern(filters.q)
    query.and([{ $or: [{ title: pattern }, { description: pattern }] }]) // .and : se combine avec le filtre de ville
  }
  if (filters.minPrice !== undefined) query.where('priceCents').gte(filters.minPrice)
  if (filters.maxPrice !== undefined) query.where('priceCents').lte(filters.maxPrice)
  return query.sort({ createdAt: -1, _id: -1 }).limit(50)
}

export async function getPublic(id: string) {
  const listing = await Listing.findOne({ _id: id, status: 'available' }).select(publicFields)
  if (!listing) throw notFoundListing()
  return listing
}
