import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'

const app = createApp()

type Method = 'get' | 'post' | 'patch' | 'delete'

const newId = () => new Types.ObjectId().toString()
const tokenFor = (userId: string) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET as string, { expiresIn: '2h' })
const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

const valid = {
  title: 'Vélo de ville',
  description: 'Très bon état',
  priceCents: 8500,
  category: 'loisirs',
  city: 'Lyon',
}

const create = (token: string, body: object = valid) =>
  request(app).post('/api/listings').set(auth(token)).send(body)

let userId: string
let token: string

beforeEach(() => {
  userId = newId()
  token = tokenFor(userId)
})

describe('CRUD nominal', () => {
  test('liste vide → 200 {"items":[]}', async () => {
    const res = await request(app).get('/api/listings').set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ items: [] })
  })

  test('POST → 201 avec l\'annonce créée, id et ownerId en string, jamais _id', async () => {
    const res = await create(token, { ...valid, title: '  Vélo de ville  ' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      ...valid,
      id: expect.any(String),
      ownerId: userId,
      status: 'available',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    expect(res.body).not.toHaveProperty('_id')
    expect(res.body).not.toHaveProperty('__v')
  })

  test('POST sans description → description vide', async () => {
    const res = await create(token, { title: 'Vélo', priceCents: 8500, category: 'loisirs', city: 'Lyon' })
    expect(res.status).toBe(201)
    expect(res.body.description).toBe('')
  })

  test('GET liste → ses annonces, plus récentes d\'abord', async () => {
    const first = await create(token, { ...valid, title: 'Première' })
    const second = await create(token, { ...valid, title: 'Seconde' })
    const res = await request(app).get('/api/listings').set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([second.body.id, first.body.id])
  })

  test('GET :id → 200 avec l\'annonce', async () => {
    const created = await create(token)
    const res = await request(app).get(`/api/listings/${created.body.id}`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body).toEqual(created.body)
  })

  test('PATCH du prix seul → seul le prix change', async () => {
    const created = await create(token)
    const res = await request(app)
      .patch(`/api/listings/${created.body.id}`)
      .set(auth(token))
      .send({ priceCents: 7000 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ...created.body, priceCents: 7000, updatedAt: expect.any(String) })
  })

  test('PATCH status "sold" → annonce vendue', async () => {
    const created = await create(token)
    const res = await request(app)
      .patch(`/api/listings/${created.body.id}`)
      .set(auth(token))
      .send({ status: 'sold' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('sold')
  })

  test('DELETE → 204 sans corps, puis GET → 404 NOT_FOUND', async () => {
    const created = await create(token)
    const del = await request(app).delete(`/api/listings/${created.body.id}`).set(auth(token))
    expect(del.status).toBe(204)
    expect(del.text).toBe('')

    const res = await request(app).get(`/api/listings/${created.body.id}`).set(auth(token))
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('entrées invalides → 400 INVALID_INPUT', () => {
  test.each([
    ['titre vide', { ...valid, title: '' }],
    ['titre en espaces', { ...valid, title: '   ' }],
    ['titre de 121 caractères', { ...valid, title: 'x'.repeat(121) }],
    ['description de 2001 caractères', { ...valid, description: 'x'.repeat(2001) }],
    ['prix 0', { ...valid, priceCents: 0 }],
    ['prix négatif', { ...valid, priceCents: -5 }],
    ['prix non entier', { ...valid, priceCents: 12.5 }],
    ['prix en texte', { ...valid, priceCents: '85' }],
    ['prix au-delà de l\'entier sûr', { ...valid, priceCents: 9007199254740992 }],
    ['catégorie inconnue', { ...valid, category: 'jouets' }],
    ['ville vide', { ...valid, city: ' ' }],
    ['ville de 81 caractères', { ...valid, city: 'x'.repeat(81) }],
    ['statut inconnu', { ...valid, status: 'archived' }],
    ['champ inconnu', { ...valid, color: 'rouge' }],
    ['id fourni', { ...valid, id: newId() }],
    ['ownerId fourni', { ...valid, ownerId: newId() }],
    ['titre manquant', { priceCents: 8500, category: 'loisirs', city: 'Lyon' }],
  ])('POST %s', async (_label, body) => {
    const res = await create(token, body)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: { code: 'INVALID_INPUT', message: expect.any(String) } })

    const list = await request(app).get('/api/listings').set(auth(token))
    expect(list.body.items).toHaveLength(0)
  })

  test('POST prix de 1 centime → accepté', async () => {
    const res = await create(token, { ...valid, priceCents: 1 })
    expect(res.status).toBe(201)
  })

  test.each([
    ['vide', {}],
    ['id fourni', { id: newId() }],
    ['ownerId fourni', { ownerId: newId() }],
    ['champ inconnu', { color: 'rouge' }],
    ['prix 0', { priceCents: 0 }],
    ['titre en espaces', { title: '   ' }],
  ])('PATCH %s', async (_label, body) => {
    const created = await create(token)
    const res = await request(app).patch(`/api/listings/${created.body.id}`).set(auth(token)).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test.each<Method>(['get', 'patch', 'delete'])('%s sur un id mal formé → 400', async (method) => {
    const res = await request(app)[method]('/api/listings/abc').set(auth(token)).send({ priceCents: 7000 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test.each<Method>(['get', 'patch', 'delete'])('%s sur un id valide absent → 404', async (method) => {
    const res = await request(app)[method](`/api/listings/${newId()}`).set(auth(token)).send({ priceCents: 7000 })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('authentification → 401 UNAUTHORIZED', () => {
  const routes: [Method, string][] = [
    ['get', '/api/listings'],
    ['post', '/api/listings'],
    ['get', `/api/listings/${newId()}`],
    ['patch', `/api/listings/${newId()}`],
    ['delete', `/api/listings/${newId()}`],
  ]
  const headers: [string, () => string | undefined][] = [
    ['sans header', () => undefined],
    ['Bearer invalide', () => 'Bearer pas-un-jwt'],
    ['token signé avec un autre secret', () => `Bearer ${jwt.sign({ sub: newId() }, 'autre-secret')}`],
    [
      'token expiré',
      () => `Bearer ${jwt.sign({ sub: newId(), exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET as string)}`,
    ],
  ]
  const cases = routes.flatMap(([method, path]) =>
    headers.map(([label, header]) => [method, path, label, header] as const),
  )

  test.each(cases)('%s %s, %s', async (method, path, _label, header) => {
    const req = request(app)[method](path).send(valid)
    const value = header()
    if (value) req.set('Authorization', value)
    const res = await req
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})
