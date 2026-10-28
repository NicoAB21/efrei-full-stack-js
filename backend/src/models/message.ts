import { model, Schema } from 'mongoose'

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

messageSchema.index({ conversationId: 1, createdAt: 1 })

export const Message = model('Message', messageSchema)
