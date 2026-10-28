// US3 — Isolation entre deux vendeurs A et B (spec : User Story 3, constitution III).
// B ne doit rien pouvoir faire sur les annonces de A, même en appelant l'API directement :
// l'annonce d'un autre compte est traitée comme inexistante (404, pas 403).
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'

const app = createApp()

type Account = { id: string; token: string }
type Listing = { id: string; ownerId: string; title: string; priceCents: number; updatedAt: string }

// Vrais comptes créés par l'API (inscription → JWT), pas de token fabriqué à la main.
async function register(email: string): Promise<Account> {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'motdepasse' })
  expect(res.status).toBe(201)
  return { id: res.body.user.id, token: res.body.token }
}

const as = (account: Account) => ({ Authorization: `Bearer ${account.token}` })

async function publish(account: Account, title: string): Promise<Listing> {
  const res = await request(app)
    .post('/api/listings')
    .set(as(account))
    .send({ title, priceCents: 8500, category: 'loisirs', cityCode: '69123', postalCode: '69001' })
  expect(res.status).toBe(201)
  return res.body
}

let alice: Account
let bob: Account
let aliceListing: Listing
let bobListing: Listing

beforeEach(async () => {
  alice = await register('alice@example.test')
  bob = await register('bob@example.test')
  aliceListing = await publish(alice, 'Vélo de ville')
  bobListing = await publish(bob, 'Lampe de bureau')
})

describe('liste « Mes annonces »', () => {
  test('chacun ne voit que ses propres annonces', async () => {
    const forBob = await request(app).get('/api/listings').set(as(bob))
    expect(forBob.status).toBe(200)
    expect(forBob.body.items.map((l: Listing) => l.id)).toEqual([bobListing.id])

    const forAlice = await request(app).get('/api/listings').set(as(alice))
    expect(forAlice.body.items.map((l: Listing) => l.id)).toEqual([aliceListing.id])
  })
})

describe("B agit sur l'annonce de A", () => {
  const unknownId = () => new Types.ObjectId().toString()

  // Pour chaque méthode, la réponse doit être identique à celle d'un id inexistant :
  // B ne peut même pas savoir que l'annonce de A existe.
  test.each([
    ['GET', (id: string) => request(app).get(`/api/listings/${id}`).set(as(bob))],
    ['PATCH', (id: string) => request(app).patch(`/api/listings/${id}`).set(as(bob)).send({ priceCents: 1 })],
    ['DELETE', (id: string) => request(app).delete(`/api/listings/${id}`).set(as(bob))],
  ])('%s → 404 NOT_FOUND, même réponse qu\'un id inexistant', async (_method, send) => {
    const onAlice = await send(aliceListing.id)
    const onNothing = await send(unknownId())

    expect(onAlice.status).toBe(404)
    expect(onAlice.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } })
    expect(onAlice.body).toEqual(onNothing.body)
    expect(onNothing.status).toBe(404)
  })

  test("après le PATCH et le DELETE de B, l'annonce de A est intacte", async () => {
    await request(app).patch(`/api/listings/${aliceListing.id}`).set(as(bob)).send({ priceCents: 1, title: 'Piraté' })
    await request(app).delete(`/api/listings/${aliceListing.id}`).set(as(bob))

    const res = await request(app).get(`/api/listings/${aliceListing.id}`).set(as(alice))
    expect(res.status).toBe(200)
    expect(res.body).toEqual(aliceListing) // même prix, même titre, même updatedAt : rien n'a été écrit
  })
})

describe("B tente d'imposer le propriétaire ou l'identifiant", () => {
  test('POST avec ownerId de A → 400, aucune annonce créée chez A', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set(as(bob))
      .send({ title: 'Cadeau', priceCents: 100, category: 'autre', cityCode: '75056', postalCode: '75001', ownerId: alice.id })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')

    const forAlice = await request(app).get('/api/listings').set(as(alice))
    expect(forAlice.body.items).toHaveLength(1)
  })

  test.each([
    ['ownerId', () => ({ ownerId: alice.id })],
    ['id', () => ({ id: aliceListing.id })],
  ])('PATCH de sa propre annonce avec %s → 400, propriétaire inchangé', async (_field, body) => {
    const res = await request(app).patch(`/api/listings/${bobListing.id}`).set(as(bob)).send(body())
    expect(res.status).toBe(400)

    const after = await request(app).get(`/api/listings/${bobListing.id}`).set(as(bob))
    expect(after.body.ownerId).toBe(bob.id)
  })
})

// Change le 1er caractère de la signature, toujours pour un caractère différent.
function tamper(token: string) {
  const [header, payload, signature] = token.split('.')
  return `${header}.${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`
}

describe('sans session valide', () => {
  test.each([
    ['sans header', undefined],
    ['token falsifié (autre secret) au nom de A', () => `Bearer ${jwt.sign({ sub: alice.id }, 'pas-le-bon-secret')}`],
    ['token de A à la signature modifiée', () => `Bearer ${tamper(alice.token)}`],
  ])("%s → 401 sur l'annonce de A", async (_label, header) => {
    const req = request(app).get(`/api/listings/${aliceListing.id}`)
    if (header) req.set('Authorization', header())
    const res = await req
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})
