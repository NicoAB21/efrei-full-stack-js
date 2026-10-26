import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { jest } from '@jest/globals'
import { User } from '../src/models/user.js'
import { createApp } from '../src/app.js'

const app = createApp()
const credentials = { email: 'Alice@Example.test', password: 'password123' }

test('les erreurs de validation sont en français', async () => {
  const res = await request(app).post('/api/auth/register').send({ ...credentials, email: 'invalide' })
  expect(res.status).toBe(400)
  expect(res.body.error.message).toBe('email : adresse e-mail invalide')
})

test('un email inconnu passe aussi par bcrypt avec le coût 10', async () => {
  const compare = jest.spyOn(bcrypt, 'compare')
  try {
    const res = await request(app).post('/api/auth/login').send(credentials)
    expect(res.status).toBe(401)
    expect(compare).toHaveBeenCalledTimes(1)
    expect(compare).toHaveBeenCalledWith(credentials.password, expect.stringMatching(/^\$2b\$10\$/))
  } finally {
    compare.mockRestore()
  }
})

test('inscription : réponse publique, email normalisé et JWT utilisable de deux heures', async () => {
  const res = await request(app).post('/api/auth/register').send(credentials)
  expect(res.status).toBe(201)
  expect(res.body).toEqual({ user: { id: expect.any(String), email: 'alice@example.test' }, token: expect.any(String) })
  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as jwt.JwtPayload
  expect(payload.sub).toBe(res.body.user.id)
  expect(payload.exp! - payload.iat!).toBe(7200)
  const stored = await User.findById(res.body.user.id)
  expect(stored!.passwordHash).not.toBe(credentials.password)
  expect(await bcrypt.compare(credentials.password, stored!.passwordHash)).toBe(true)
  expect(stored!.toJSON()).not.toHaveProperty('passwordHash')
  const listings = await request(app).get('/api/listings').auth(res.body.token, { type: 'bearer' })
  expect(listings.status).toBe(200)
})

test('email déjà utilisé, indépendamment de la casse', async () => {
  await request(app).post('/api/auth/register').send(credentials).expect(201)
  const res = await request(app).post('/api/auth/register').send({ ...credentials, email: 'alice@example.test' })
  expect(res.status).toBe(409)
  expect(res.body.error.code).toBe('EMAIL_ALREADY_USED')
})

describe.each(['register', 'login'])('%s : validation', (route) => {
  test.each([
    { ...credentials, password: '1234567' },
    { ...credentials, email: 'invalide' },
    { ...credentials, extra: true },
    {},
  ])('refuse %j', async (body) => {
    const res = await request(app).post(`/api/auth/${route}`).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })
})

test('connexion et erreurs neutres', async () => {
  const registered = await request(app).post('/api/auth/register').send(credentials).expect(201)
  const res = await request(app).post('/api/auth/login').send({ ...credentials, email: ' ALICE@example.test ' })
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ user: registered.body.user, token: expect.any(String) })
  const wrong = await request(app).post('/api/auth/login').send({ ...credentials, password: 'incorrect123' })
  const unknown = await request(app).post('/api/auth/login').send({ ...credentials, email: 'unknown@example.test' })
  expect(wrong.status).toBe(401)
  expect(unknown.status).toBe(401)
  expect(wrong.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect' } })
  expect(unknown.body).toEqual(wrong.body)
})
