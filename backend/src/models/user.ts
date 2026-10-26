import { Schema, model } from 'mongoose'
import { toJSONOptions } from '../schemas/common.js'

const userSchema = new Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true, toJSON: toJSONOptions })

export const User = model('User', userSchema)
