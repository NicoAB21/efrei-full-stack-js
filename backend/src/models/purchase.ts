import { model, Schema } from 'mongoose'
import { toJSONOptions } from '../schemas/common.js'

export const PURCHASE_STATUSES = ['pending', 'confirmed', 'refunded', 'expired'] as const

// Achat de démonstration (spec 005) : prix et titre figés au lancement, état final sans retour arrière.
const purchaseSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    listingTitle: { type: String, required: true },
    listingPhotoUrl: { type: String, default: null }, // vignette de la photo principale au lancement
    priceCents: { type: Number, required: true },
    status: { type: String, enum: PURCHASE_STATUSES, default: 'pending' },
    checkoutSessionId: { type: String, default: null },
    checkoutUrl: { type: String, default: null },
    paymentIntentId: { type: String, default: null },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: toJSONOptions }, // réponses : projection explicite dans purchase.service
)

purchaseSchema.index({ buyerId: 1, createdAt: -1 })
purchaseSchema.index({ buyerId: 1, listingId: 1, status: 1 })
purchaseSchema.index({ checkoutSessionId: 1 }, { unique: true, partialFilterExpression: { checkoutSessionId: { $type: 'string' } } })

export const Purchase = model('Purchase', purchaseSchema)
