import express, { Router } from 'express'
import type Stripe from 'stripe'
import { invalidInput } from '../errors.js'
import { gateway } from '../payments/gateway.js'
import { handleCompleted, handleExpired } from '../services/purchase.service.js'

// Monté AVANT express.json() : la signature Stripe se vérifie sur le corps brut.
export const stripeWebhookRouter = Router()

stripeWebhookRouter.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  let event: Stripe.Event
  try {
    event = gateway.verifyEvent(req.body, req.get('stripe-signature'))
  } catch {
    throw invalidInput('Signature Stripe invalide') // message falsifié ou corrompu : aucun effet
  }
  if (event.type === 'checkout.session.completed') await handleCompleted(event.data.object)
  else if (event.type === 'checkout.session.expired') await handleExpired(event.data.object)
  res.json({ received: true })
})
