import Stripe from 'stripe'
import { paymentsConfig } from '../config.js'

// Seule couche qui parle à Stripe : les tests remplacent ses méthodes (jest.spyOn), sans réseau.
const CHECKOUT_TTL_S = 30 * 60 // minimum accepté par Stripe

function client() {
  const config = paymentsConfig()
  if (!config) throw new Error('Paiement désactivé')
  return { stripe: new Stripe(config.secretKey), config }
}

export const gateway = {
  async createCheckout(input: { purchaseId: string; listingId: string; title: string; priceCents: number }) {
    const { stripe, config } = client()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: input.priceCents, product_data: { name: `[DÉMO] ${input.title}` } } }],
      metadata: { purchaseId: input.purchaseId, listingId: input.listingId },
      client_reference_id: input.purchaseId,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_S,
      success_url: `${config.frontUrl}/achats?achat=${input.purchaseId}`, // la page de retour affiche CET achat
      cancel_url: `${config.frontUrl}/annonces/${input.listingId}?paiement=annule`,
    })
    return { id: session.id, url: session.url as string }
  },

  async refund(paymentIntentId: string) {
    await client().stripe.refunds.create({ payment_intent: paymentIntentId })
  },

  /** Vérifie la signature Stripe sur le corps BRUT ; lève si elle est absente ou fausse. */
  verifyEvent(rawBody: Buffer, signature: string | undefined) {
    const { stripe, config } = client()
    if (!signature) throw new Error('Signature absente')
    return stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret)
  },
}
