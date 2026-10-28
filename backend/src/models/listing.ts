import { model, Schema } from 'mongoose'
import { toJSONOptions } from '../schemas/common.js'
import { CATEGORIES, STATUSES } from '../schemas/listing.js'

export const MAX_PHOTOS = 5

// Photos imbriquées : l'ordre du tableau est l'ordre d'affichage, la première est la photo principale.
const photoSchema = new Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    cardUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
)

const listingSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priceCents: { type: Number, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    city: { type: String, required: true },
    status: { type: String, enum: STATUSES, default: 'available' },
    photos: {
      type: [photoSchema],
      default: [],
      validate: { validator: (photos: unknown[]) => photos.length <= MAX_PHOTOS, message: `${MAX_PHOTOS} photos maximum` },
    },
  },
  { timestamps: true, toJSON: toJSONOptions },
)

listingSchema.index({ ownerId: 1, createdAt: -1 })
listingSchema.index({ status: 1, createdAt: -1 })

export const Listing = model('Listing', listingSchema)
