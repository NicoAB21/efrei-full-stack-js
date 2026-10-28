// Spec 002 : favoris liés au compte. Comptes créés par l'API, comme dans isolation.test.ts.
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { Favorite } from '../src/models/favorite.js'
import { Listing } from '../src/models/listing.js'

const app = createApp()

type Account = { id: string; token: string }
type ListingBody = { id: string; title: string }

async function register(email: string): Promise<Account> {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'motdepasse' })
  return { id: res.body.user.id, token: res.body.token }
}
const as = (account: Account) => ({ Authorization: `Bearer ${account.token}` })
async function publish(account: Account, title: string): Promise<ListingBody> {
  const res = await request(app)
    .post('/api/listings')
    .set(as(account))
    .send({ title, priceCents: 8500, category: 'loisirs', cityCode: '69123', postalCode: '69001' })
  return res.body
}
const put = (account: Account, id: string) => request(app).put(`/api/favorites/${id}`).set(as(account))
const del = (account: Account, id: string) => request(app).delete(`/api/favorites/${id}`).set(as(account))
const list = (account: Account) => request(app).get('/api/favorites').set(as(account))
const unknownId = () => new Types.ObjectId().toString()

let seller: Account
let buyer: Account
let bike: ListingBody

beforeEach(async () => {
  seller = await register('vendeur@example.test')
  buyer = await register('acheteur@example.test')
  bike = await publish(seller, 'Vélo de ville')
})

describe('US1 : ajouter et retirer', () => {
  test('PUT → 204, rejoué → 204 et un seul favori', async () => {
    expect((await put(buyer, bike.id)).status).toBe(204)
    expect((await put(buyer, bike.id)).status).toBe(204)
    expect(await Favorite.countDocuments({ userId: buyer.id })).toBe(1)
  })

  test('DELETE → 204, puis 404 car plus dans les favoris', async () => {
    await put(buyer, bike.id)
    expect((await del(buyer, bike.id)).status).toBe(204)
    const again = await del(buyer, bike.id)
    expect(again.status).toBe(404)
    expect(again.body.error.code).toBe('NOT_FOUND')
  })

  test('sa propre annonce → 400', async () => {
    const res = await put(seller, bike.id)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('annonce vendue ou inexistante → 404, id mal formé → 400', async () => {
    await request(app).patch(`/api/listings/${bike.id}`).set(as(seller)).send({ status: 'sold' })
    expect((await put(buyer, bike.id)).status).toBe(404)
    expect((await put(buyer, unknownId())).status).toBe(404)
    expect((await put(buyer, 'abc')).status).toBe(400)
    expect((await del(buyer, 'abc')).status).toBe(400)
  })

  test('200 favoris maximum : le 201e → 400 avec message', async () => {
    const docs = await Listing.insertMany(
      Array.from({ length: 201 }, (_, i) => ({ ownerId: seller.id, title: `Objet ${i}`, priceCents: 100, category: 'autre', city: 'Lyon' })),
    )
    await Favorite.insertMany(docs.slice(0, 200).map((l) => ({ userId: buyer.id, listingId: l._id })))
    const res = await put(buyer, String(docs[200]._id))
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/200/)
    // Déjà en favori : rien ne change, pas d'erreur de limite
    expect((await put(buyer, String(docs[0]._id))).status).toBe(204)
  })

  test('sans token → 401 sur toutes les routes', async () => {
    for (const req of [
      request(app).get('/api/favorites'),
      request(app).put(`/api/favorites/${bike.id}`),
      request(app).delete(`/api/favorites/${bike.id}`),
      request(app).post('/api/favorites/import').send({ listingIds: [] }),
    ]) {
      const res = await req
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    }
  })
})

describe('US2 : retrouver ses favoris', () => {
  test('liste du plus récent au plus ancien, id = annonce, favoritedAt, aucune donnée privée', async () => {
    const lamp = await publish(seller, 'Lampe')
    await put(buyer, bike.id)
    await new Promise((r) => setTimeout(r, 5))
    await put(buyer, lamp.id)
    const res = await list(buyer)
    expect(res.status).toBe(200)
    expect(res.body.items.map((i: ListingBody) => i.id)).toEqual([lamp.id, bike.id])
    expect(res.body.items[0]).toEqual(expect.objectContaining({ title: 'Lampe', status: 'available', favoritedAt: expect.any(String) }))
    const raw = JSON.stringify(res.body)
    expect(raw).not.toMatch(/"_id"|email|passwordHash/)
  })

  test('annonce vendue : gardée avec status "sold"', async () => {
    await put(buyer, bike.id)
    await request(app).patch(`/api/listings/${bike.id}`).set(as(seller)).send({ status: 'sold' })
    const res = await list(buyer)
    expect(res.body.items).toEqual([expect.objectContaining({ id: bike.id, status: 'sold' })])
  })

  test('annonce supprimée : absente de la liste et favori supprimé en base', async () => {
    await put(buyer, bike.id)
    await request(app).delete(`/api/listings/${bike.id}`).set(as(seller))
    expect((await list(buyer)).body.items).toEqual([])
    expect(await Favorite.countDocuments({ listingId: bike.id })).toBe(0)
  })
})

describe('US3 : isolation des favoris', () => {
  test('chacun ne voit que ses favoris, et ne peut pas retirer ceux des autres', async () => {
    const other = await register('autre@example.test')
    const lamp = await publish(seller, 'Lampe')
    await put(buyer, bike.id)
    await put(other, lamp.id)

    expect((await list(other)).body.items.map((i: ListingBody) => i.id)).toEqual([lamp.id])
    expect((await list(buyer)).body.items.map((i: ListingBody) => i.id)).toEqual([bike.id])

    const res = await del(other, bike.id) // favori de « buyer » seulement
    expect(res.status).toBe(404)
    expect(await Favorite.countDocuments({ userId: buyer.id, listingId: bike.id })).toBe(1)
  })

  test('token falsifié → 401', async () => {
    const forged = jwt.sign({ sub: buyer.id }, 'pas-le-bon-secret')
    const res = await request(app).get('/api/favorites').set('Authorization', `Bearer ${forged}`)
    expect(res.status).toBe(401)
  })
})

describe('US4 : import des favoris du navigateur', () => {
  const importIds = (account: Account, body: object) => request(app).post('/api/favorites/import').set(as(account)).send(body)

  test('importe les annonces valides, ignore doublons, vendues, inexistantes et siennes', async () => {
    const lamp = await publish(seller, 'Lampe')
    const sold = await publish(seller, 'Vendu')
    await request(app).patch(`/api/listings/${sold.id}`).set(as(seller)).send({ status: 'sold' })
    const own = await publish(buyer, 'À moi')
    await put(buyer, bike.id) // déjà présent

    const res = await importIds(buyer, { listingIds: [bike.id, lamp.id, lamp.id, sold.id, unknownId(), own.id] })
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([lamp.id])
    expect((await list(buyer)).body.items.map((i: ListingBody) => i.id).sort()).toEqual([bike.id, lamp.id].sort())
  })

  test('entrées invalides → 400', async () => {
    expect((await importIds(buyer, { listingIds: Array(201).fill(bike.id) })).status).toBe(400)
    expect((await importIds(buyer, { listingIds: ['abc'] })).status).toBe(400)
    expect((await importIds(buyer, { listingIds: [], foo: 1 })).status).toBe(400)
  })

  test("s'arrête à 200 favoris au total", async () => {
    const docs = await Listing.insertMany(
      Array.from({ length: 5 }, (_, i) => ({ ownerId: seller.id, title: `Objet ${i}`, priceCents: 100, category: 'autre', city: 'Lyon' })),
    )
    const filler = await Listing.insertMany(
      Array.from({ length: 198 }, (_, i) => ({ ownerId: seller.id, title: `Rempli ${i}`, priceCents: 100, category: 'autre', city: 'Lyon' })),
    )
    await Favorite.insertMany(filler.map((l) => ({ userId: buyer.id, listingId: l._id })))
    const res = await importIds(buyer, { listingIds: docs.map((d) => String(d._id)) })
    expect(res.body.items).toHaveLength(2)
    expect(await Favorite.countDocuments({ userId: buyer.id })).toBe(200)
  })
})
