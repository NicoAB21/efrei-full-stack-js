import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { errorHandler } from '../src/errors.js'
import { requireAuth } from '../src/middleware/auth.js'

// Mini app de test : une route protégée qui renvoie l'utilisateur du token.
const app = express()
app.get('/private', requireAuth, (req, res) => {
  res.json({ userId: req.userId })
})
app.use(errorHandler)

const secret = () => process.env.JWT_SECRET as string

test('token valide → userId posé sur la requête', async () => {
  const token = jwt.sign({ sub: 'abc123' }, secret(), { expiresIn: '2h' })
  const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ userId: 'abc123' })
})

test.each([
  ['sans header', undefined],
  ['schéma autre que Bearer', 'Basic abc'],
  ['token illisible', 'Bearer pas-un-jwt'],
  ['autre secret', `Bearer ${jwt.sign({ sub: 'x' }, 'autre-secret')}`],
  ['token expiré', `Bearer ${jwt.sign({ sub: 'x', exp: Math.floor(Date.now() / 1000) - 10 }, 'test-secret')}`],
])('%s → 401 UNAUTHORIZED', async (_label, header) => {
  const req = request(app).get('/private')
  if (header) req.set('Authorization', header)
  const res = await req
  expect(res.status).toBe(401)
  expect(res.body.error.code).toBe('UNAUTHORIZED')
})
