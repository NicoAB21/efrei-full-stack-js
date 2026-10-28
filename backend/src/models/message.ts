import { model, Schema } from 'mongoose'
import { toJSONOptions } from '../schemas/common.js'

const messageSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: toJSONOptions },
)

messageSchema.index({ recipientId: 1, createdAt: -1 })

export const Message = model('Message', messageSchema)
