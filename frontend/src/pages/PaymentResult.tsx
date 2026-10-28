import { CircleCheck, CircleX, Clock, LoaderCircle, Package, ShoppingBag } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import type { Purchase } from '../constants'
import { errorMessage } from '../listings'
import { formatPrice } from '../price'

// Retour de Stripe (/paiement?achat=<id>). La vente n'est validée que par le webhook :
// on relit l'achat jusqu'à ce que Stripe l'ait confirmé (quelques secondes en général).
const RETRY_MS = 1500
const MAX_RETRIES = 10

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

export function PaymentResult() {
  const id = useSearchParams()[0].get('achat')
  const [purchase, setPurchase] = useState<Purchase | null | undefined>(undefined) // undefined = chargement
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let active = true
    apiFetch<{ items: Purchase[] }>('/purchases')
      .then((r) => { if (active) setPurchase(r.items.find((p) => p.id === id) ?? null) })
      .catch((err: unknown) => { if (active) setError(errorMessage(err)) })
    return () => { active = false }
  }, [id, tries])

  const waiting = purchase?.status === 'pending' && tries < MAX_RETRIES
  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(() => setTries((n) => n + 1), RETRY_MS)
    return () => clearTimeout(timer)
  }, [waiting, tries])

  if (error) return <Shell><Alert type="error">{error}</Alert></Shell>
  if (purchase === undefined) return <Shell><p role="status" className="muted">Chargement de votre paiement…</p></Shell>
  if (purchase === null) {
    return (
      <Shell>
        <Result icon={<CircleX size={56} aria-hidden />} tone="error" title="Paiement introuvable">
          Ce lien ne correspond à aucun de vos achats.
        </Result>
        <Actions />
      </Shell>
    )
  }

  return (
    <Shell>
      {purchase.status === 'confirmed' && (
        <Result icon={<CircleCheck size={56} aria-hidden />} tone="ok" title="Paiement confirmé !">
          Merci pour votre achat. « {purchase.listingTitle} » est à vous.
        </Result>
      )}
      {purchase.status === 'pending' && (
        <Result icon={<LoaderCircle size={56} className={waiting ? 'spin' : ''} aria-hidden />} tone="wait" title="Paiement en cours de confirmation">
          {waiting
            ? 'Nous attendons la confirmation de votre paiement, cela ne prend que quelques secondes.'
            : 'La confirmation prend plus de temps que prévu. Votre achat apparaîtra dans « Mes achats » dès qu’elle sera reçue.'}
        </Result>
      )}
      {purchase.status === 'refunded' && (
        <Result icon={<CircleX size={56} aria-hidden />} tone="error" title="Cet article vient d’être vendu">
          Un autre acheteur a payé juste avant vous. Vous êtes remboursé automatiquement, sans rien faire.
        </Result>
      )}
      {purchase.status === 'expired' && (
        <Result icon={<Clock size={56} aria-hidden />} tone="error" title="Paiement expiré">
          Le délai de paiement est dépassé : rien n’a été débité. Vous pouvez relancer l’achat depuis l’annonce.
        </Result>
      )}

      <section className="panel payment-recap" aria-labelledby="recap-title">
        <h2 id="recap-title" className="h3">Récapitulatif</h2>
        <div className="payment-item">
          {purchase.listingPhotoUrl ? (
            <img src={purchase.listingPhotoUrl} alt="" width={96} height={96} />
          ) : (
            <span className="payment-thumb" aria-hidden><Package size={32} /></span>
          )}
          <div>
            <strong>{purchase.listingTitle}</strong>
            <span className="muted small">Commande n° {purchase.id.slice(-8).toUpperCase()}</span>
          </div>
          <b>{formatPrice(purchase.priceCents)}</b>
        </div>
        <dl className="payment-lines">
          <div><dt>Date</dt><dd>{date.format(new Date(purchase.confirmedAt ?? purchase.createdAt))}</dd></div>
          <div><dt>Moyen de paiement</dt><dd>Carte bancaire</dd></div>
          <div className="total"><dt>{purchase.status === 'refunded' ? 'Remboursé' : 'Total payé'}</dt><dd>{formatPrice(purchase.priceCents)}</dd></div>
        </dl>
      </section>

      {purchase.status === 'confirmed' && (
        <section className="panel" aria-labelledby="next-title">
          <h2 id="next-title" className="h3">Et maintenant ?</h2>
          <ol className="payment-steps">
            <li>Le vendeur est informé de la vente : l’annonce a été retirée des annonces en ligne.</li>
            <li>Organisez la remise de l’objet avec le vendeur.</li>
            <li>Retrouvez cet achat à tout moment dans « Mes achats ».</li>
          </ol>
        </section>
      )}

      <Actions />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="stack payment-page">{children}</div>
}

function Result({ icon, tone, title, children }: { icon: ReactNode; tone: 'ok' | 'wait' | 'error'; title: string; children: ReactNode }) {
  return (
    <div className={`payment-result is-${tone}`} role="status">
      {icon}
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  )
}

function Actions() {
  return (
    <div className="row" style={{ justifyContent: 'center' }}>
      <Link to="/achats" className="btn btn-primary">
        <ShoppingBag size={18} aria-hidden />
        Voir mes achats
      </Link>
      <Link to="/" className="btn btn-secondary">Continuer mes recherches</Link>
    </div>
  )
}
