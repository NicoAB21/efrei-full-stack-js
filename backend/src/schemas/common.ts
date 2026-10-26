import { Types, type ToObjectOptions } from 'mongoose'
import { z } from 'zod'

// ObjectId strict (24 hex) : `mongoose.isValidObjectId` accepte aussi toute chaîne de 12 caractères.
export const objectIdParam = z.string().regex(/^[a-f0-9]{24}$/i, 'identifiant mal formé')

// Sérialisation commune des modèles : `id` string, jamais `_id`, `__v` ni `passwordHash`.
// Usage : new Schema({...}, { timestamps: true, toJSON: toJSONOptions })
export const toJSONOptions: ToObjectOptions = {
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.passwordHash
    for (const [key, value] of Object.entries(ret)) {
      // Références (ownerId…) en string
      if (value instanceof Types.ObjectId) ret[key] = String(value)
    }
    return ret
  },
}
