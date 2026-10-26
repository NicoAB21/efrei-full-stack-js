import { notFound } from '../errors.js'
import { Listing } from '../models/listing.js'
import type { ListingCreateInput, ListingUpdateInput } from '../schemas/listing.js'

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
