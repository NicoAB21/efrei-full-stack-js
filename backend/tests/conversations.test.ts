// US5 : messagerie privée acheteur ↔ vendeur, une conversation par couple acheteur–annonce.
// Comptes et annonces créés par l'API, comme dans isolation.test.ts.
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { Conversation } from '../src/models/conversation.js'
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
const reply = (account: Account, id: string, body = 'Oui, toujours disponible') =>
  request(app).post(`/api/conversations/${id}/messages`).set(as(account)).send({ body })
const list = (account: Account) => request(app).get('/api/conversations').set(as(account))
const thread = (account: Account, id: string) => request(app).get(`/api/conversations/${id}`).set(as(account))
const unread = async (account: Account) => (await request(app).get('/api/conversations/unread').set(as(account))).body.count
const read = (account: Account, id: string) => request(app).post(`/api/conversations/${id}/read`).set(as(account))
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

describe('premier contact depuis une annonce', () => {
  test('201 : conversation créée, vendeur calculé par le serveur', async () => {
    const res = await write(buyer, bike.id)
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ conversationId: expect.any(String), message: { id: expect.any(String), body: 'Bonjour, est-il toujours disponible ?', createdAt: expect.any(String), mine: true } })
    const conversation = await Conversation.findById(res.body.conversationId)
    expect(String(conversation?.sellerId)).toBe(seller.id)
    expect(String(conversation?.buyerId)).toBe(buyer.id)
  })

  test('un second message depuis la même annonce reprend la même conversation', async () => {
    const first = await write(buyer, bike.id)
    const second = await write(buyer, bike.id, { body: 'Je peux passer ce soir' })
    expect(second.body.conversationId).toBe(first.body.conversationId)
    expect(await Conversation.countDocuments()).toBe(1)
    expect(await Message.countDocuments()).toBe(2)
  })

  test('deux premiers messages simultanés → une seule conversation', async () => {
    const [a, b] = await Promise.all([write(buyer, bike.id), write(buyer, bike.id, { body: 'Et le prix ?' })])
    expect([a.status, b.status]).toEqual([201, 201])
    expect(a.body.conversationId).toBe(b.body.conversationId)
    expect(await Conversation.countDocuments()).toBe(1)
  })

  test('deux acheteurs sur la même annonce → deux conversations séparées', async () => {
    const a = await write(buyer, bike.id)
    const b = await write(other, bike.id)
    expect(a.body.conversationId).not.toBe(b.body.conversationId)
    expect((await list(seller)).body.items).toHaveLength(2)
  })
})

describe('discussion entre les deux personnes', () => {
  test('le vendeur répond, les deux voient le fil dans l’ordre, avec l’annonce d’origine', async () => {
    const { conversationId } = (await write(buyer, bike.id)).body
    expect((await reply(seller, conversationId)).status).toBe(201)
    expect((await reply(buyer, conversationId, 'Parfait, à ce soir')).status).toBe(201)

    for (const [account, mine] of [[buyer, [true, false, true]], [seller, [false, true, false]]] as const) {
      const res = await thread(account, conversationId)
      expect(res.status).toBe(200)
      expect(res.body.listing).toEqual({ id: bike.id, title: 'Vélo de ville', photoUrl: null, priceCents: 8500, status: 'available' })
      expect(res.body.messages.map((m: { body: string }) => m.body)).toEqual(['Bonjour, est-il toujours disponible ?', 'Oui, toujours disponible', 'Parfait, à ce soir'])
      expect(res.body.messages.map((m: { mine: boolean }) => m.mine)).toEqual(mine)
    }
  })

  test('liste : la plus récente en tête, rôle, interlocuteur et aperçu du dernier message', async () => {
    const lamp = await publish(seller, 'Lampe')
    const first = (await write(buyer, bike.id)).body.conversationId
    await new Promise((r) => setTimeout(r, 5))
    await write(buyer, lamp.id, { body: 'La lampe fonctionne ?' })
    await new Promise((r) => setTimeout(r, 5))
    await reply(seller, first, 'Oui pour le vélo')

    const items = (await list(buyer)).body.items
    expect(items.map((c: { listing: { title: string } }) => c.listing.title)).toEqual(['Vélo de ville', 'Lampe'])
    expect(items[0]).toEqual(expect.objectContaining({ role: 'buyer', other: { label: expect.stringMatching(/^Membre [0-9A-F]{4}$/), role: 'seller' }, lastMessage: { body: 'Oui pour le vélo', at: expect.any(String), mine: false }, unread: 1 }))
    expect(JSON.stringify((await list(seller)).body)).not.toMatch(/email|acheteur@|vendeur@|passwordHash/)
  })

  test('annonce vendue ou supprimée : la conversation continue, avec son état', async () => {
    const { conversationId } = (await write(buyer, bike.id)).body
    await request(app).patch(`/api/listings/${bike.id}`).set(as(seller)).send({ status: 'sold' })
    expect((await thread(buyer, conversationId)).body.listing.status).toBe('sold')
    expect((await reply(seller, conversationId, 'Désolé, vendu')).status).toBe(201)
    await request(app).delete(`/api/listings/${bike.id}`).set(as(seller))
    const res = await thread(buyer, conversationId)
    expect(res.body.listing).toEqual(expect.objectContaining({ title: 'Vélo de ville', status: 'deleted' }))
    expect(res.body.messages).toHaveLength(2)
  })
})

describe('non-lus et mention « Vu »', () => {
  test('le destinataire a une pastille, ouvrir la conversation la remet à zéro', async () => {
    const { conversationId } = (await write(buyer, bike.id)).body
    await write(buyer, bike.id, { body: 'Et le prix ?' })
    expect(await unread(seller)).toBe(2)
    expect(await unread(buyer)).toBe(0)

    expect((await read(seller, conversationId)).status).toBe(204)
    expect(await unread(seller)).toBe(0)
    await reply(seller, conversationId)
    expect(await unread(buyer)).toBe(1)
  })

  test('otherReadAt : l’acheteur sait que le vendeur a lu', async () => {
    const { conversationId } = (await write(buyer, bike.id)).body
    expect((await thread(buyer, conversationId)).body.otherReadAt).toBeNull()
    await read(seller, conversationId)
    const res = await thread(buyer, conversationId)
    expect(new Date(res.body.otherReadAt).getTime()).toBeGreaterThanOrEqual(new Date(res.body.messages[0].createdAt).getTime())
  })

  test('pastille cumulée sur plusieurs conversations', async () => {
    const lamp = await publish(seller, 'Lampe')
    await write(buyer, bike.id)
    await write(other, lamp.id)
    expect(await unread(seller)).toBe(2)
  })
})

describe('confidentialité', () => {
  test('un tiers ne voit ni ne lit ni ne répond : 404, rien ne change', async () => {
    const { conversationId } = (await write(buyer, bike.id)).body
    expect((await list(other)).body).toEqual({ items: [] })
    for (const res of [await thread(other, conversationId), await reply(other, conversationId), await read(other, conversationId)]) {
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    }
    expect(await Message.countDocuments()).toBe(1)
    expect(await unread(seller)).toBe(1)
  })

  test('impossible d’imposer le destinataire, l’expéditeur ou l’annonce → 400, rien d’enregistré', async () => {
    for (const extra of [{ recipientId: other.id }, { senderId: other.id }, { listingId: unknownId() }]) {
      const res = await write(buyer, bike.id, { body: 'Bonjour', ...extra })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_INPUT')
    }
    expect(await Message.countDocuments()).toBe(0)
  })

  test('conversation inexistante → 404, id mal formé → 400', async () => {
    expect((await thread(buyer, unknownId())).status).toBe(404)
    expect((await thread(buyer, 'abc')).status).toBe(400)
  })
})

describe('refus au premier contact', () => {
  test('sur sa propre annonce → 400', async () => {
    const res = await write(seller, bike.id)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('annonce vendue → 404 (pas de nouvelle conversation)', async () => {
    await request(app).patch(`/api/listings/${bike.id}`).set(as(seller)).send({ status: 'sold' })
    const res = await write(buyer, bike.id)
    expect(res.status).toBe(404)
    expect(await Conversation.countDocuments()).toBe(0)
  })

  test('annonce inexistante → 404, id mal formé → 400', async () => {
    expect((await write(buyer, unknownId())).status).toBe(404)
    expect((await write(buyer, 'abc')).status).toBe(400)
  })

  test.each([
    ['vide', { body: '' }],
    ['en espaces', { body: '   ' }],
    ['de 1001 caractères', { body: 'x'.repeat(1001) }],
    ['absent', {}],
    ['qui n’est pas du texte', { body: 42 }],
  ])('message %s → 400', async (_label, body) => {
    const res = await write(buyer, bike.id, body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('message de 1000 caractères → accepté', async () => {
    expect((await write(buyer, bike.id, { body: 'x'.repeat(1000) })).status).toBe(201)
  })
})

describe('authentification → 401', () => {
  test.each([
    ['sans header', undefined],
    ['token signé avec un autre secret', () => `Bearer ${jwt.sign({ sub: unknownId() }, 'autre-secret')}`],
  ])('%s', async (_label, header) => {
    const id = unknownId()
    const calls = [
      request(app).post(`/api/public/listings/${bike.id}/messages`).send({ body: 'Bonjour' }),
      request(app).get('/api/conversations'),
      request(app).get('/api/conversations/unread'),
      request(app).get(`/api/conversations/${id}`),
      request(app).post(`/api/conversations/${id}/messages`).send({ body: 'Bonjour' }),
      request(app).post(`/api/conversations/${id}/read`),
    ]
    for (const call of calls) {
      if (header) call.set('Authorization', header())
      const res = await call
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    }
    expect(await Message.countDocuments()).toBe(0)
  })
})
