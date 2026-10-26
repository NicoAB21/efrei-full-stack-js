import { model, Schema } from 'mongoose'
import { toJSONOptions } from '../schemas/common.js'
import { CATEGORIES, STATUSES } from '../schemas/listing.js'

const listingSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priceCents: { type: Number, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    city: { type: String, required: true },
    status: { type: String, enum: STATUSES, default: 'available' },
  },
  { timestamps: true, toJSON: toJSONOptions },
)

listingSchema.index({ ownerId: 1, createdAt: -1 })
listingSchema.index({ status: 1, createdAt: -1 })

export const Listing = model('Listing', listingSchema)
