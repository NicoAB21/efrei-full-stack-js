import { model, Schema } from 'mongoose'

// Favori = couple (utilisateur, annonce), unique. Jamais exposé tel quel : l'API renvoie l'annonce.
const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true })
favoriteSchema.index({ userId: 1, createdAt: -1 })
favoriteSchema.index({ listingId: 1 })

export const Favorite = model('Favorite', favoriteSchema)
