// Spec 005 : lancer un achat de démonstration et voir ses achats. Stripe est simulé (aucun réseau).
import { jest } from '@jest/globals'
import { Types } from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { paymentsConfig } from '../src/config.js'
import { Listing } from '../src/models/listing.js'
import { as, fakeGateway, paid, publish, register, sendWebhook, type Account } from './payments-helpers.js'

const app = createApp()
let stripe: ReturnType<typeof fakeGateway>
let seller: Account
let buyer: Account
let listingId: string

const buy = (a: Account, body: object) => request(app).post('/api/purchases').set(as(a)).send(body)

beforeEach(async () => {
  stripe = fakeGateway()
  seller = await register(app, 'vendeur@example.test')
  buyer = await register(app, 'acheteur@example.test')
  listingId = await publish(app, seller)
})
afterEach(() => jest.restoreAllMocks())

describe('US1 : lancer un achat', () => {
  test('201 + URL Stripe, prix lu en base', async () => {
    const res = await buy(buyer, { listingId })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' })
    expect(stripe.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ listingId, title: 'Vélo de ville', priceCents: 8500 }))
  })

  test('prix envoyé par le client ou champ inconnu → 400', async () => {
    expect((await buy(buyer, { listingId, priceCents: 1 })).status).toBe(400)
    expect(stripe.createCheckout).not.toHaveBeenCalled()
  })

  test('double clic → même page de paiement, une seule session', async () => {
    const first = await buy(buyer, { listingId })
    const second = await buy(buyer, { listingId })
    expect(second.body.url).toBe(first.body.url)
    expect(stripe.createCheckout).toHaveBeenCalledTimes(1)
  })

  test.each([
    ['sa propre annonce', () => buy(seller, { listingId })],
    ['Immobilier', async () => buy(buyer, { listingId: await publish(app, seller, { category: 'immobilier' }) })],
    ['Véhicules', async () => buy(buyer, { listingId: await publish(app, seller, { category: 'vehicules' }) })],
    ['plus de 10 000 €', async () => buy(buyer, { listingId: await publish(app, seller, { priceCents: 1_000_001 }) })],
    ['identifiant mal formé', () => buy(buyer, { listingId: 'abc' })],
  ])('%s → 400', async (_label, send) => {
    const res = await send()
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('annonce vendue ou inexistante → 404, sans token → 401', async () => {
    await request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ status: 'sold' })
    expect((await buy(buyer, { listingId })).status).toBe(404)
    expect((await buy(buyer, { listingId: new Types.ObjectId().toString() })).status).toBe(404)
    expect((await request(app).post('/api/purchases').send({ listingId })).status).toBe(401)
  })

  test('Stripe injoignable → 502 « Paiement indisponible », aucun achat, annonce disponible', async () => {
    stripe.createCheckout.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await buy(buyer, { listingId })
    expect(res.status).toBe(502)
    expect(res.body.error).toEqual({ code: 'PAYMENT_UNAVAILABLE', message: 'Paiement indisponible, réessayez plus tard' })
    expect((await request(app).get('/api/purchases').set(as(buyer))).body.items).toEqual([])
    expect((await request(app).get(`/api/public/listings/${listingId}`)).body.status).toBe('available')
  })

  test('buyable du détail public : vrai si achetable, faux pour Immobilier ou > 10 000 €', async () => {
    const detail = async (id: string) => (await request(app).get(`/api/public/listings/${id}`)).body.buyable
    expect(await detail(listingId)).toBe(true)
    expect(await detail(await publish(app, seller, { category: 'immobilier' }))).toBe(false)
    expect(await detail(await publish(app, seller, { priceCents: 1_000_001 }))).toBe(false)
  })
})

describe('configuration Stripe', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  test('clé réelle ou secret de webhook manquant → démarrage refusé', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_xxx'
    expect(() => paymentsConfig()).toThrow(/TEST/)
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
    process.env.STRIPE_WEBHOOK_SECRET = 'pas-un-secret'
    expect(() => paymentsConfig()).toThrow(/whsec_/)
  })

  test('sans clé : paiement désactivé, routes 404, buyable faux, le reste fonctionne', async () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(paymentsConfig()).toBeNull()
    const offline = createApp()
    expect((await request(offline).post('/api/purchases').set(as(buyer)).send({ listingId })).status).toBe(404)
    expect((await request(offline).post('/api/stripe/webhook').send({})).status).toBe(404)
    const detail = await request(offline).get(`/api/public/listings/${listingId}`)
    expect(detail.status).toBe(200)
    expect(detail.body.buyable).toBe(false)
  })
})

describe('US4 : mes achats et mes ventes', () => {
  test('liste du plus récent au plus ancien, sans référence interne ni acheteur', async () => {
    const lamp = await publish(app, seller, { title: 'Lampe', priceCents: 1500 })
    await buy(buyer, { listingId })
    await new Promise((r) => setTimeout(r, 5))
    await buy(buyer, { listingId: lamp })
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_2'))

    const res = await request(app).get('/api/purchases').set(as(buyer))
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([
      { id: expect.any(String), listingId: lamp, listingTitle: 'Lampe', listingPhotoUrl: null, priceCents: 1500, status: 'confirmed', createdAt: expect.any(String), confirmedAt: expect.any(String) },
      { id: expect.any(String), listingId, listingTitle: 'Vélo de ville', listingPhotoUrl: null, priceCents: 8500, status: 'pending', createdAt: expect.any(String), confirmedAt: null },
    ])
    expect(JSON.stringify(res.body)).not.toMatch(/buyerId|cs_test|pi_|checkout|email/)
  })

  test('photo principale figée au lancement : reste affichée même si le vendeur change ses photos', async () => {
    const cover = { id: 'p1', url: '/uploads/p1-1600.webp', cardUrl: '/uploads/p1-480.webp', width: 10, height: 10 }
    await Listing.updateOne({ _id: listingId }, { photos: [cover] })
    await buy(buyer, { listingId })
    await Listing.updateOne({ _id: listingId }, { photos: [] })
    const [item] = (await request(app).get('/api/purchases').set(as(buyer))).body.items
    expect(item.listingPhotoUrl).toBe('/uploads/p1-480.webp')
  })

  test('isolation : C ne voit pas les achats de B', async () => {
    const other = await register(app, 'autre@example.test')
    await buy(buyer, { listingId })
    expect((await request(app).get('/api/purchases').set(as(other))).body.items).toEqual([])
    expect((await request(app).get('/api/purchases').set(as(seller))).body.items).toEqual([])
  })

  test('le vendeur voit « vendue en ligne » (date, prix), sans donnée de l’acheteur', async () => {
    await buy(buyer, { listingId })
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    const res = await request(app).get(`/api/listings/${listingId}`).set(as(seller))
    expect(res.body.status).toBe('sold')
    expect(res.body.soldOnline).toEqual(expect.objectContaining({ at: expect.any(String), priceCents: 8500 }))
    expect(JSON.stringify(res.body)).not.toMatch(new RegExp(`${buyer.id}|acheteur@`))
  })
})
