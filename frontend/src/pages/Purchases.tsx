import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { DemoBanner } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { PURCHASE_STATUSES, type Purchase } from '../constants'
import { errorMessage, isNotFound } from '../listings'
import { formatPrice } from '../price'

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
// Au retour de Stripe, le webhook peut arriver quelques secondes après le navigateur
const RETRY_MS = 2000
const MAX_RETRIES = 5

export function Purchases() {
  const [params] = useSearchParams()
  const returnedId = params.get('achat') // retour de Stripe : l'achat qui vient d'être payé
  const [items, setItems] = useState<Purchase[] | null>(null)
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let active = true
    apiFetch<{ items: Purchase[] }>('/purchases')
      .then((r) => { if (active) setItems(r.items) })
      .catch((err: unknown) => {
        if (active) setError(isNotFound(err) ? 'Le paiement de démonstration n’est pas activé sur ce serveur.' : errorMessage(err))
      })
    return () => { active = false }
  }, [tries])

  const latest = items?.find((p) => p.id === returnedId)
  const waiting = latest?.status === 'pending' && tries < MAX_RETRIES
  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(() => setTries((n) => n + 1), RETRY_MS)
    return () => clearTimeout(timer)
  }, [waiting, tries])

  return (
    <div className="stack" style={{ maxWidth: 720, marginInline: 'auto' }}>
      <h1>Mes achats</h1>
      <DemoBanner />

      {latest && (
        latest.status === 'confirmed' ? (
          <Alert type="success">Achat confirmé : « {latest.listingTitle} » est à vous.</Alert>
        ) : latest.status === 'refunded' ? (
          <Alert type="error">« {latest.listingTitle} » a été vendue juste avant votre paiement : vous êtes remboursé automatiquement.</Alert>
        ) : latest.status === 'pending' ? (
          <p role="status" className="muted">Paiement en cours de confirmation…{!waiting && ' Rechargez la page dans un instant.'}</p>
        ) : null
      )}

      {error ? (
        <Alert type="error">{error}</Alert>
      ) : items === null ? (
        <p role="status" className="muted">Chargement de vos achats…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucun achat pour l’instant" action={<Link to="/" className="btn btn-primary">Parcourir les annonces</Link>}>
          Les annonces achetées en ligne apparaîtront ici.
        </EmptyState>
      ) : (
        <ul className="purchase-list">
          {items.map((p) => (
            <li key={p.id} className="panel">
              <div className="stack" style={{ gap: 4 }}>
                <strong>{p.listingTitle}</strong>
                <span className="muted small">{date.format(new Date(p.confirmedAt ?? p.createdAt))}</span>
              </div>
              <div className="row">
                <b>{formatPrice(p.priceCents)}</b>
                <span className={`badge ${p.status === 'confirmed' ? 'badge-available' : 'badge-sold'}`}>{PURCHASE_STATUSES[p.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
