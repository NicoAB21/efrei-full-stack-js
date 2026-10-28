import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiFetch, ApiError } from '../api'
import { useAuth } from '../auth'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
import { ListingCard } from '../components/ListingCard'
import type { Listing } from '../constants'
import { useFavoriteProps, useFavorites } from '../favorites'
import { errorMessage } from '../listings'

// Connecté : favoris du compte (GET /api/favorites, vendues comprises).
// Visiteur : favoris du navigateur, relus un par un dans la vitrine (une annonce vendue ou supprimée y est introuvable).

async function loadVisitorFavorites(ids: string[]) {
  const found = await Promise.all(
    ids.map((id) =>
      apiFetch<Listing>(`/public/listings/${id}`).catch((err) => {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }),
    ),
  )
  return found.filter((listing): listing is Listing => listing !== null)
}

export function Favorites() {
  const { user } = useAuth()
  const { ids } = useFavorites()
  const favoriteProps = useFavoriteProps()
  const [items, setItems] = useState<Listing[] | null>(null)
  const [error, setError] = useState('')
  // Visiteur : on recharge quand la liste d'ids change (ajout depuis un autre onglet, retrait…)
  const visitorKey = user ? '' : ids.join(',')

  useEffect(() => {
    let active = true
    const load = user
      ? apiFetch<{ items: Listing[] }>('/favorites').then((r) => r.items)
      : loadVisitorFavorites(visitorKey ? visitorKey.split(',') : [])
    load
      .then((result) => { if (active) setItems(result) })
      .catch((err: unknown) => { if (active) setError(errorMessage(err)) })
    return () => { active = false }
  }, [user, visitorKey])

  // Un favori retiré disparaît tout de suite de la page
  const shown = items?.filter((listing) => ids.includes(listing.id)) ?? null

  return (
    <div className="stack" style={{ gap: 'var(--s-5)' }}>
      <div className="stack" style={{ gap: 'var(--s-2)' }}>
        <h1>Mes favoris</h1>
        {shown && shown.length > 0 && (
          <p className="muted" role="status">
            {shown.length} annonce{shown.length > 1 ? 's' : ''} gardée{shown.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {!user && (
        <Alert type="success">
          Vos favoris sont gardés sur cet appareil. <Link to="/login">Connectez-vous</Link> pour les retrouver partout.
        </Alert>
      )}

      {error ? (
        <Alert type="error">{error}</Alert>
      ) : shown === null ? (
        <p className="muted" role="status">Chargement de vos favoris…</p>
      ) : shown.length === 0 ? (
        <EmptyState title="Aucun favori" action={<Link to="/" className="btn btn-primary">Parcourir les annonces</Link>}>
          Cliquez sur le cœur d’une annonce pour la retrouver ici.
        </EmptyState>
      ) : (
        <section aria-labelledby="favorites-list-title">
          <h2 id="favorites-list-title" className="sr-only">Liste de vos favoris</h2>
          <div className="listing-grid">
            {shown.map((listing) => {
              const sold = listing.status === 'sold'
              return (
                <div key={listing.id} className="stack" style={{ gap: 4 }}>
                  <ListingCard listing={listing} to={sold ? undefined : `/annonces/${listing.id}`} {...favoriteProps(listing)} />
                  {sold && <p className="muted small">Plus disponible</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
