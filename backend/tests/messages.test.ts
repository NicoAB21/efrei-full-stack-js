import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { Message } from '../src/models/message.js'

const app = createApp()

type Account = { id: string; token: string }
type ListingBody = { id: string; title: string }

async function register(email: string): Promise<Account> {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'motdepasse' })
  expect(res.status).toBe(201)
  return { id: res.body.user.id, token: res.body.token }
}

const as = (account: Account) => ({ Authorization: `Bearer ${account.token}` })

async function publish(account: Account, title: string): Promise<ListingBody> {
  const res = await request(app)
    .post('/api/listings')
    .set(as(account))
    .send({ title, priceCents: 8500, category: 'loisirs', cityCode: '69123', postalCode: '69001' })
  expect(res.status).toBe(201)
  return res.body
}

const write = (account: Account, listingId: string, body: object = { body: 'Bonjour, est-il toujours disponible ?' }) =>
  request(app).post(`/api/public/listings/${listingId}/messages`).set(as(account)).send(body)
const inbox = (account: Account) => request(app).get('/api/messages').set(as(account))
const unknownId = () => new Types.ObjectId().toString()

let seller: Account
let buyer: Account
let other: Account
let bike: ListingBody

beforeEach(async () => {
  seller = await register('vendeur@example.test')
  buyer = await register('acheteur@example.test')
  other = await register('tiers@example.test')
  bike = await publish(seller, 'Vélo de ville')
})

describe('envoyer un message au vendeur', () => {
  test('201 avec le message, destinataire calculé par le serveur', async () => {
    const res = await write(buyer, bike.id, { body: '  Bonjour, est-il toujours disponible ?  ' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      id: expect.any(String),
      listingId: bike.id,
      senderId: buyer.id,
      recipientId: seller.id,
      body: 'Bonjour, est-il toujours disponible ?',
      createdAt: expect.any(String),
    })
    expect(res.body).not.toHaveProperty('_id')
  })

  test('le vendeur le voit dans ses messages reçus, avec le titre de l\'annonce', async () => {
    const sent = await write(buyer, bike.id)
    const res = await inbox(seller)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ items: [{ ...sent.body, listingTitle: 'Vélo de ville' }] })
  })

  test('messages reçus du plus récent au plus ancien', async () => {
    const first = await write(buyer, bike.id, { body: 'Premier' })
    const second = await write(other, bike.id, { body: 'Second' })
    const res = await inbox(seller)
    expect(res.body.items.map((m: { id: string }) => m.id)).toEqual([second.body.id, first.body.id])
  })
})

describe('confidentialité', () => {
  test('un tiers ne voit pas le message, l\'expéditeur non plus dans ses reçus', async () => {
    await write(buyer, bike.id)
    expect((await inbox(other)).body).toEqual({ items: [] })
    expect((await inbox(buyer)).body).toEqual({ items: [] })
  })

  test('impossible d\'imposer le destinataire ou l\'expéditeur → 400, rien d\'enregistré', async () => {
    for (const extra of [{ recipientId: other.id }, { senderId: other.id }, { listingId: unknownId() }]) {
      const res = await write(buyer, bike.id, { body: 'Bonjour', ...extra })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_INPUT')
    }
    expect(await Message.countDocuments()).toBe(0)
  })
})

describe('refus', () => {
  test('sur sa propre annonce → 400', async () => {
    const res = await write(seller, bike.id)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('annonce vendue → 404', async () => {
    await request(app).patch(`/api/listings/${bike.id}`).set(as(seller)).send({ status: 'sold' })
    const res = await write(buyer, bike.id)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  test('annonce inexistante → 404', async () => {
    const res = await write(buyer, unknownId())
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  test('id mal formé → 400', async () => {
    const res = await write(buyer, 'abc')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test.each([
    ['vide', { body: '' }],
    ['en espaces', { body: '   ' }],
    ['de 1001 caractères', { body: 'x'.repeat(1001) }],
    ['absent', {}],
    ['qui n\'est pas du texte', { body: 42 }],
  ])('message %s → 400', async (_label, body) => {
    const res = await write(buyer, bike.id, body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('message de 1000 caractères → accepté', async () => {
    const res = await write(buyer, bike.id, { body: 'x'.repeat(1000) })
    expect(res.status).toBe(201)
  })
})

describe('authentification → 401', () => {
  test.each([
    ['sans header', undefined],
    ['token signé avec un autre secret', () => `Bearer ${jwt.sign({ sub: unknownId() }, 'autre-secret')}`],
  ])('%s', async (_label, header) => {
    const post = request(app).post(`/api/public/listings/${bike.id}/messages`).send({ body: 'Bonjour' })
    const get = request(app).get('/api/messages')
    if (header) {
      post.set('Authorization', header())
      get.set('Authorization', header())
    }
    for (const res of [await post, await get]) {
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    }
    expect(await Message.countDocuments()).toBe(0)
  })
})
