import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { HttpError, unauthorized } from '../errors.js'
import { User } from '../models/user.js'
import type { Credentials } from '../schemas/auth.js'

// Même coût que les mots de passe enregistrés, sans créer de compte fictif.
const DUMMY_PASSWORD_HASH = '$2b$10$Hlouutui9asnzfSCQWZxlO/Eymp2K5DGqqF9wDBIOfR/Al2GsHYUe'

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '2h' })
}

function session(user: { _id: { toString(): string }; email: string }) {
  const id = user._id.toString()
  return { user: { id, email: user.email }, token: signToken(id) }
}

export async function register({ email, password }: Credentials) {
  const passwordHash = await bcrypt.hash(password, 10)
  try {
    await User.init()
    return session(await User.create({ email, passwordHash }))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new HttpError(409, 'EMAIL_ALREADY_USED', 'Cette adresse email est déjà utilisée')
    }
    throw error
  }
}

export async function login({ email, password }: Credentials) {
  const user = await User.findOne({ email })
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !passwordMatches) {
    throw unauthorized('Email ou mot de passe incorrect')
  }
  return session(user)
}
