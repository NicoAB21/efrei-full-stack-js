import { invalidInput, notFound } from '../errors.js'
import { Listing } from '../models/listing.js'
import { Message } from '../models/message.js'
import type { MessageCreateInput } from '../schemas/message.js'

export async function send(senderId: string, listingId: string, data: MessageCreateInput) {
  const listing = await Listing.findOne({ _id: listingId, status: 'available' }).select('ownerId')
  if (!listing) throw notFound('Annonce introuvable')
  if (String(listing.ownerId) === senderId) throw invalidInput('Vous ne pouvez pas vous écrire à vous-même')

  return Message.create({ listingId, senderId, recipientId: listing.ownerId, body: data.body })
}

export async function listReceived(userId: string) {
  const messages = await Message.find({ recipientId: userId }).sort({ createdAt: -1, _id: -1 })
  const listings = await Listing.find({ _id: { $in: messages.map((m) => m.listingId) } }).select('title')
  const titles = new Map(listings.map((l) => [String(l._id), l.title]))

  return messages.map((message) => ({
    ...message.toJSON(),
    listingTitle: titles.get(String(message.listingId)) ?? null,
  }))
}
