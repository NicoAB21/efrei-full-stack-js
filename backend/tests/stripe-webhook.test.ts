// Spec 005 : la vente n'est validée que par un webhook Stripe signé ; une seule vente par annonce.
import { jest } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { Purchase } from '../src/models/purchase.js'
import { as, fakeGateway, paid, publish, register, sendWebhook, type Account } from './payments-helpers.js'

const app = createApp()
let stripe: ReturnType<typeof fakeGateway>
let seller: Account
let buyer: Account
let listingId: string

const buy = (a: Account) => request(app).post('/api/purchases').set(as(a)).send({ listingId })
const listing = async () => (await request(app).get(`/api/listings/${listingId}`).set(as(seller))).body
const statuses = async () => (await Purchase.find().sort({ createdAt: 1 })).map((p) => p.status)

beforeEach(async () => {
  stripe = fakeGateway()
  seller = await register(app, 'vendeur@example.test')
  buyer = await register(app, 'acheteur@example.test')
  listingId = await publish(app, seller)
  await buy(buyer) // session cs_test_1
})
afterEach(() => jest.restoreAllMocks())

describe('US1 : confirmation par Stripe', () => {
  test('completed signé → annonce vendue, achat confirmé, absente de la vitrine', async () => {
    const res = await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    expect(res.status).toBe(200)
    expect(await listing()).toEqual(expect.objectContaining({ status: 'sold', soldOnline: expect.objectContaining({ priceCents: 8500 }) }))
    const [purchase] = await Purchase.find()
    expect(purchase.status).toBe('confirmed')
    expect(purchase.confirmedAt).toBeInstanceOf(Date)
    expect(purchase.paymentIntentId).toBe('pi_cs_test_1')
    const vitrine = await request(app).get('/api/public/listings')
    expect(vitrine.body.items).toEqual([])
  })
})

describe('US2 : rien sans confirmation authentique', () => {
  test('signature avec un autre secret → 400, rien ne change', async () => {
    const res = await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'), 'whsec_pirate')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
    expect((await listing()).status).toBe('available')
    expect(await statuses()).toEqual(['pending'])
  })

  test('sans en-tête Stripe-Signature → 400', async () => {
    const res = await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').send(JSON.stringify({ type: 'checkout.session.completed', data: { object: paid('cs_test_1') } }))
    expect(res.status).toBe(400)
    expect((await listing()).status).toBe('available')
  })

  test('paiement non abouti (unpaid) → 200, rien ne change', async () => {
    await sendWebhook(app, 'checkout.session.completed', { id: 'cs_test_1', payment_status: 'unpaid', payment_intent: null })
    expect((await listing()).status).toBe('available')
    expect(await statuses()).toEqual(['pending'])
  })

  test('session expirée → achat expiré, annonce disponible', async () => {
    expect((await sendWebhook(app, 'checkout.session.expired', { id: 'cs_test_1', payment_status: 'unpaid' })).status).toBe(200)
    expect(await statuses()).toEqual(['expired'])
    expect((await listing()).status).toBe('available')
  })
})

describe('US3 : une seule vente par annonce', () => {
  test('deux paiements confirmés en même temps → 1 vente, 1 remboursement', async () => {
    const other = await register(app, 'autre@example.test')
    await buy(other) // cs_test_2
    const [a, b] = await Promise.all([
      sendWebhook(app, 'checkout.session.completed', paid('cs_test_1')),
      sendWebhook(app, 'checkout.session.completed', paid('cs_test_2')),
    ])
    expect([a.status, b.status]).toEqual([200, 200])
    expect((await statuses()).sort()).toEqual(['confirmed', 'refunded'])
    expect(stripe.refund).toHaveBeenCalledTimes(1)
    const loser = await Purchase.findOne({ status: 'refunded' })
    expect(stripe.refund).toHaveBeenCalledWith(loser?.paymentIntentId)
    const winner = await Purchase.findOne({ status: 'confirmed' })
    expect(String((await listing()).soldOnline.purchaseId)).toBe(winner?.id)
  })

  test('même événement rejoué → aucun nouvel effet ni remboursement', async () => {
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    const before = await listing()
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    expect(await listing()).toEqual(before)
    expect(await statuses()).toEqual(['confirmed'])
    expect(stripe.refund).not.toHaveBeenCalled()
  })

  test.each([
    ['supprimée', () => request(app).delete(`/api/listings/${listingId}`).set(as(seller))],
    ['marquée vendue par le vendeur', () => request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ status: 'sold' })],
  ])('annonce %s pendant le paiement → remboursé', async (_label, change) => {
    await change()
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    expect(await statuses()).toEqual(['refunded'])
    expect(stripe.refund).toHaveBeenCalledWith('pi_cs_test_1')
  })

  test('prix modifié après le clic → vente au prix figé', async () => {
    await request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ priceCents: 99_900 })
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    expect((await listing()).soldOnline.priceCents).toBe(8500)
  })

  test('remboursement Stripe en échec → achat remis en attente, réessayé au renvoi', async () => {
    await request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ status: 'sold' })
    stripe.refund.mockRejectedValueOnce(new Error('Stripe indisponible'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect((await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))).status).toBe(500)
    expect(await statuses()).toEqual(['pending'])
    expect((await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))).status).toBe(200)
    expect(await statuses()).toEqual(['refunded'])
    expect(stripe.refund).toHaveBeenCalledTimes(2)
  })

  test('vente en ligne définitive : remise en vente → 400, suppression → 204', async () => {
    await sendWebhook(app, 'checkout.session.completed', paid('cs_test_1'))
    const res = await request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ status: 'available' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/vendue en ligne/)
    expect((await request(app).delete(`/api/listings/${listingId}`).set(as(seller))).status).toBe(204)
  })

  test('annonce vendue hors ligne puis remise en vente : autorisé (pas de soldOnline)', async () => {
    await request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ status: 'sold' })
    expect((await request(app).patch(`/api/listings/${listingId}`).set(as(seller)).send({ status: 'available' })).status).toBe(200)
  })
})
