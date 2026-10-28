import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { Link } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
import { PURCHASE_STATUSES, type Purchase } from '../constants'
import { errorMessage, isNotFound } from '../listings'
import { formatPrice } from '../price'

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

export function Purchases() {
  const [items, setItems] = useState<Purchase[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiFetch<{ items: Purchase[] }>('/purchases')
      .then((r) => { if (active) setItems(r.items) })
      .catch((err: unknown) => {
        if (active) setError(isNotFound(err) ? 'Le paiement en ligne n’est pas activé sur ce serveur.' : errorMessage(err))
      })
    return () => { active = false }
  }, [])

  return (
    <div className="stack" style={{ maxWidth: 760, marginInline: 'auto' }}>
      <h1>Mes achats</h1>

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
            <li key={p.id} className="panel payment-item">
              {p.listingPhotoUrl ? (
                <img src={p.listingPhotoUrl} alt="" width={72} height={72} loading="lazy" />
              ) : (
                <span className="payment-thumb" aria-hidden><Package size={28} /></span>
              )}
              <div>
                <strong>{p.listingTitle}</strong>
                <span className="muted small">{date.format(new Date(p.confirmedAt ?? p.createdAt))}</span>
              </div>
              <div className="stack" style={{ gap: 4, justifyItems: 'end' }}>
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
