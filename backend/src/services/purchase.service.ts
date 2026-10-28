import type Stripe from 'stripe'
import { invalidInput, notFound, paymentUnavailable } from '../errors.js'
import { Listing } from '../models/listing.js'
import { Purchase } from '../models/purchase.js'
import { gateway } from '../payments/gateway.js'
import { isBuyable } from '../schemas/purchase.js'

// Une session Checkout vit 30 min : au-delà de 25 min on en ouvre une nouvelle plutôt que de renvoyer l'ancienne
const REUSE_SESSION_MS = 25 * 60 * 1000

// Projection explicite : jamais l'acheteur ni les références Stripe dans les réponses
const purchaseFields = 'listingId listingTitle priceCents status createdAt confirmedAt'

export async function list(buyerId: string) {
  return Purchase.find({ buyerId }).select(purchaseFields).sort({ createdAt: -1, _id: -1 })
}

/** Lance l'achat : renvoie l'URL de la page de paiement Stripe. */
export async function start(buyerId: string, listingId: string) {
  const listing = await Listing.findOne({ _id: listingId, status: 'available' })
  if (!listing) throw notFound('Annonce introuvable')
  if (String(listing.ownerId) === buyerId) throw invalidInput('Vous ne pouvez pas acheter votre propre annonce')
  if (!isBuyable(listing)) throw invalidInput('Cette annonce ne peut pas être achetée en ligne (Immobilier, Véhicules ou plus de 10 000 €)')

  // Double clic : même page de paiement tant qu'elle est encore valable
  // ponytail: deux clics strictement simultanés peuvent ouvrir deux sessions ; sans gravité (une seule vente au webhook)
  const open = await Purchase.findOne({
    buyerId,
    listingId,
    status: 'pending',
    checkoutUrl: { $ne: null },
    createdAt: { $gt: new Date(Date.now() - REUSE_SESSION_MS) },
  })
  if (open?.checkoutUrl) return open.checkoutUrl

  const purchase = await Purchase.create({ buyerId, listingId, listingTitle: listing.title, priceCents: listing.priceCents })
  try {
    const session = await gateway.createCheckout({ purchaseId: purchase.id, listingId, title: listing.title, priceCents: listing.priceCents })
    await Purchase.updateOne({ _id: purchase._id }, { checkoutSessionId: session.id, checkoutUrl: session.url })
    return session.url
  } catch (err) {
    await purchase.deleteOne()
    console.error('Stripe Checkout indisponible', err)
    throw paymentUnavailable()
  }
}

const paymentIntentOf = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)

/** Webhook checkout.session.completed : seule source de vérité d'une vente (FR-004). Idempotent. */
export async function handleCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return
  const purchase = await Purchase.findOne({ checkoutSessionId: session.id, status: 'pending' })
  if (!purchase) return // inconnu ou déjà traité
  const paymentIntentId = paymentIntentOf(session)
  const confirm = () =>
    Purchase.updateOne({ _id: purchase._id, status: 'pending' }, { status: 'confirmed', confirmedAt: new Date(), paymentIntentId })

  // Une seule opération atomique : parmi deux paiements simultanés, un seul trouve l'annonce encore disponible
  const sold = await Listing.findOneAndUpdate(
    { _id: purchase.listingId, status: 'available' },
    { status: 'sold', soldOnline: { at: new Date(), priceCents: purchase.priceCents, purchaseId: purchase._id } },
  )
  if (sold) return void (await confirm())
  // Événement rejoué alors que la vente de CET achat est déjà enregistrée
  if (await Listing.exists({ _id: purchase.listingId, 'soldOnline.purchaseId': purchase._id })) return void (await confirm())

  // Annonce déjà vendue, supprimée ou retirée : remboursement automatique, une seule fois
  const lost = await Purchase.findOneAndUpdate({ _id: purchase._id, status: 'pending' }, { status: 'refunded', paymentIntentId })
  if (!lost || !paymentIntentId) return
  try {
    await gateway.refund(paymentIntentId)
  } catch (err) {
    // On rend l'achat « en attente » : Stripe renverra l'événement et on retentera le remboursement
    await Purchase.updateOne({ _id: purchase._id }, { status: 'pending' })
    throw err
  }
}

/** Webhook checkout.session.expired : abandon, l'annonce n'a jamais été touchée. */
export async function handleExpired(session: Stripe.Checkout.Session) {
  await Purchase.updateOne({ checkoutSessionId: session.id, status: 'pending' }, { status: 'expired' })
}
