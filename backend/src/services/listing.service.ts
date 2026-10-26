import { notFound } from '../errors.js'
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

export async function create(ownerId: string, data: ListingCreateInput) {
  return Listing.create({ ...data, ownerId })
}

export async function update(ownerId: string, id: string, data: ListingUpdateInput) {
  const listing = await Listing.findOneAndUpdate({ _id: id, ownerId }, data, { new: true })
  if (!listing) throw notFoundListing()
  return listing
}

export async function remove(ownerId: string, id: string) {
  const listing = await Listing.findOneAndDelete({ _id: id, ownerId })
  if (!listing) throw notFoundListing()
}

const literalPattern = (value: string) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

// Projection explicite : aucune jointure avec les données du vendeur.
const publicFields = 'title description priceCents category city status createdAt updatedAt ownerId'

export async function listPublic(filters: PublicQuery) {
  const query = Listing.find({ status: 'available' }).select(publicFields)
  if (filters.category) query.where('category').equals(filters.category)
  if (filters.city) query.where('city').regex(literalPattern(filters.city))
  if (filters.q) {
    const pattern = literalPattern(filters.q)
    query.or([{ title: pattern }, { description: pattern }])
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
