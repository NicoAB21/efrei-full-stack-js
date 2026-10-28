import { model, Schema } from 'mongoose'

// Conversation privée entre un acheteur et le vendeur, à propos d'une annonce (une seule par couple acheteur–annonce).
// Titre, photo et prix sont figés au premier message : la conversation reste lisible si l'annonce change ou disparaît.
const conversationSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingTitle: { type: String, required: true },
    listingPhotoUrl: { type: String, default: null },
    listingPriceCents: { type: Number, required: true },
    lastMessage: {
      type: new Schema({ body: String, senderId: Schema.Types.ObjectId, at: Date }, { _id: false }),
      default: null,
    },
    // Non-lus de chaque côté (pastille) et dernière lecture (mention « Vu »)
    buyerUnread: { type: Number, default: 0 },
    sellerUnread: { type: Number, default: 0 },
    buyerReadAt: { type: Date, default: null },
    sellerReadAt: { type: Date, default: null },
  },
  { timestamps: true },
)

conversationSchema.index({ listingId: 1, buyerId: 1 }, { unique: true })
conversationSchema.index({ buyerId: 1, 'lastMessage.at': -1 })
conversationSchema.index({ sellerId: 1, 'lastMessage.at': -1 })

export const Conversation = model('Conversation', conversationSchema)
