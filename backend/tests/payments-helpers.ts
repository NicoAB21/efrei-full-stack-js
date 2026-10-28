// Outils des tests de paiement (spec 005) : faux Stripe + webhooks signés comme Stripe le fait.
import { jest } from '@jest/globals'
import type { Express } from 'express'
import Stripe from 'stripe'
import request from 'supertest'
import { gateway } from '../src/payments/gateway.js'

export type Account = { id: string; token: string }

export async function register(app: Express, email: string): Promise<Account> {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'motdepasse' })
  return { id: res.body.user.id, token: res.body.token }
}
export const as = (a: Account) => ({ Authorization: `Bearer ${a.token}` })

export async function publish(app: Express, a: Account, extra: object = {}) {
  const res = await request(app)
    .post('/api/listings')
    .set(as(a))
    .send({ title: 'Vélo de ville', priceCents: 8500, category: 'loisirs', cityCode: '69123', postalCode: '69001', ...extra })
  return res.body.id as string
}

/** Remplace Stripe : chaque session créée reçoit cs_test_<n> ; renvoie les espions. */
export function fakeGateway() {
  let n = 0
  const createCheckout = jest.spyOn(gateway, 'createCheckout').mockImplementation(async () => {
    n += 1
    return { id: `cs_test_${n}`, url: `https://checkout.stripe.com/c/pay/cs_test_${n}` }
  })
  const refund = jest.spyOn(gateway, 'refund').mockImplementation(async () => {})
  return { createCheckout, refund }
}

const signer = new Stripe('sk_test_fake')

/** Envoie un événement Checkout au webhook, signé avec `secret` (le bon par défaut). */
export function sendWebhook(app: Express, type: string, session: object, secret = process.env.STRIPE_WEBHOOK_SECRET as string) {
  const payload = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, object: 'event', type, data: { object: { object: 'checkout.session', ...session } } })
  return request(app)
    .post('/api/stripe/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signer.webhooks.generateTestHeaderString({ payload, secret }))
    .send(payload)
}

export const paid = (id: string, paymentIntent = `pi_${id}`) => ({ id, payment_status: 'paid', payment_intent: paymentIntent })
