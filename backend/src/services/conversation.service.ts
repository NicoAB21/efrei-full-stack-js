import { Types } from 'mongoose'
import { invalidInput, notFound } from '../errors.js'
import { Conversation } from '../models/conversation.js'
import { Listing } from '../models/listing.js'
import { Message } from '../models/message.js'

type ConversationDoc = InstanceType<typeof Conversation>
type Role = 'buyer' | 'seller'

const notFoundConversation = () => notFound('Conversation introuvable')
const roleOf = (c: ConversationDoc, userId: string): Role => (String(c.buyerId) === userId ? 'buyer' : 'seller')
// Pas d'email entre membres : un repère court tiré de l'identifiant
const memberLabel = (id: unknown) => `Membre ${String(id).slice(-4).toUpperCase()}`

/** Ajoute un message : met à jour l'aperçu, incrémente les non-lus de l'autre, le sien est lu. */
async function post(conversation: ConversationDoc, senderId: string, body: string) {
  const role = roleOf(conversation, senderId)
  const other = role === 'buyer' ? 'seller' : 'buyer'
  const message = await Message.create({ conversationId: conversation._id, senderId, body })
  const at = message.createdAt
  await Conversation.updateOne(
    { _id: conversation._id },
    { lastMessage: { body, senderId, at }, $inc: { [`${other}Unread`]: 1 }, [`${role}Unread`]: 0, [`${role}ReadAt`]: at },
  )
  return { id: String(message._id), body, createdAt: at, mine: true }
}

/** Premier contact depuis une annonce (ou nouveau message sur la conversation déjà ouverte). */
export async function start(buyerId: string, listingId: string, body: string) {
  const listing = await Listing.findOne({ _id: listingId, status: 'available' })
  if (!listing) throw notFound('Annonce introuvable')
  if (String(listing.ownerId) === buyerId) throw invalidInput('Vous ne pouvez pas vous écrire à vous-même')

  const open = () =>
    Conversation.findOneAndUpdate(
      { listingId, buyerId },
      {
        $setOnInsert: {
          sellerId: listing.ownerId,
          listingTitle: listing.title,
          listingPhotoUrl: listing.photos[0]?.cardUrl ?? null,
          listingPriceCents: listing.priceCents,
        },
      },
      { upsert: true, new: true },
    )
  // Deux premiers messages simultanés : l'un crée la conversation, l'autre la retrouve (index unique)
  const conversation = await open().catch((err) => {
    if (err?.code === 11000) return open()
    throw err
  })
  const message = await post(conversation, buyerId, body)
  return { conversationId: conversation.id as string, message }
}

/** La conversation, seulement si l'utilisateur y participe (sinon 404, comme une annonce d'un autre). */
async function findMine(userId: string, id: string) {
  const conversation = await Conversation.findOne({ _id: id, $or: [{ buyerId: userId }, { sellerId: userId }] })
  if (!conversation) throw notFoundConversation()
  return conversation
}

export async function reply(userId: string, id: string, body: string) {
  return post(await findMine(userId, id), userId, body)
}

export async function markRead(userId: string, id: string) {
  const role = roleOf(await findMine(userId, id), userId)
  await Conversation.updateOne({ _id: id }, { [`${role}Unread`]: 0, [`${role}ReadAt`]: new Date() })
}

/** État actuel des annonces : disponible, vendue ou supprimée. */
async function listingStatuses(ids: Types.ObjectId[]) {
  const listings = await Listing.find({ _id: { $in: ids } }).select('status')
  const status = new Map(listings.map((l) => [String(l._id), l.status as string]))
  return (id: Types.ObjectId) => status.get(String(id)) ?? 'deleted'
}

function view(c: ConversationDoc, userId: string, statusOf: (id: Types.ObjectId) => string) {
  const role = roleOf(c, userId)
  return {
    id: c.id as string,
    role,
    other: { label: memberLabel(role === 'buyer' ? c.sellerId : c.buyerId), role: role === 'buyer' ? 'seller' : 'buyer' },
    listing: { id: String(c.listingId), title: c.listingTitle, photoUrl: c.listingPhotoUrl, priceCents: c.listingPriceCents, status: statusOf(c.listingId) },
    lastMessage: c.lastMessage ? { body: c.lastMessage.body, at: c.lastMessage.at, mine: String(c.lastMessage.senderId) === userId } : null,
    unread: role === 'buyer' ? c.buyerUnread : c.sellerUnread,
  }
}

export async function list(userId: string) {
  const conversations = await Conversation.find({ $or: [{ buyerId: userId }, { sellerId: userId }], lastMessage: { $ne: null } })
    .sort({ 'lastMessage.at': -1, _id: -1 })
    .limit(100)
  const statusOf = await listingStatuses(conversations.map((c) => c.listingId))
  return conversations.map((c) => view(c, userId, statusOf))
}

export async function get(userId: string, id: string) {
  const conversation = await findMine(userId, id)
  const [messages, statusOf] = await Promise.all([
    Message.find({ conversationId: conversation._id }).sort({ createdAt: 1, _id: 1 }),
    listingStatuses([conversation.listingId]),
  ])
  const role = roleOf(conversation, userId)
  return {
    ...view(conversation, userId, statusOf),
    // Dernière lecture de l'autre : le front affiche « Vu » sous mon dernier message s'il est plus ancien
    otherReadAt: role === 'buyer' ? conversation.sellerReadAt : conversation.buyerReadAt,
    messages: messages.map((m) => ({ id: String(m._id), body: m.body, createdAt: m.createdAt, mine: String(m.senderId) === userId })),
  }
}

/** Total des messages non lus, pour la pastille de l'en-tête. */
export async function unreadCount(userId: string) {
  const id = new Types.ObjectId(userId)
  const [asBuyer, asSeller] = await Promise.all([
    Conversation.aggregate([{ $match: { buyerId: id } }, { $group: { _id: null, n: { $sum: '$buyerUnread' } } }]),
    Conversation.aggregate([{ $match: { sellerId: id } }, { $group: { _id: null, n: { $sum: '$sellerUnread' } } }]),
  ])
  return (asBuyer[0]?.n ?? 0) + (asSeller[0]?.n ?? 0)
}
