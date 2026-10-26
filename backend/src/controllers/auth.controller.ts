import type { RequestHandler } from 'express'
import { credentialsSchema } from '../schemas/auth.js'
import * as auth from '../services/auth.service.js'

export const register: RequestHandler = async (req, res) => {
  res.status(201).json(await auth.register(credentialsSchema.parse(req.body)))
}

export const login: RequestHandler = async (req, res) => {
  res.json(await auth.login(credentialsSchema.parse(req.body)))
}
