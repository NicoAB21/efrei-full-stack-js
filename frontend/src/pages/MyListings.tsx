import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
import { ListingCard } from '../components/ListingCard'
import type { Listing } from '../constants'
import { errorMessage, fetchMyListings } from '../listings'

export function MyListings() {
  const flash = (useLocation().state as { message?: string } | null)?.message
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchMyListings()
      .then((items) => {
        if (active) setListings(items)
      })
      .catch((e: unknown) => {
        if (active) setError(errorMessage(e))
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="stack" style={{ gap: 'var(--s-5)' }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div className="stack" style={{ gap: 'var(--s-1)' }}>
          <h1>Mes annonces</h1>
          {listings && listings.length > 0 && (
            <p className="muted">
              {listings.length} annonce{listings.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {listings && listings.length > 0 && (
          <Link to="/listings/new" className="btn btn-primary btn-sm">
            <Plus size={18} aria-hidden />
            Publier une annonce
          </Link>
        )}
      </div>

      {flash && <Alert type="success">{flash}</Alert>}

      {error ? (
        <Alert type="error">{error}</Alert>
      ) : listings === null ? (
        <p className="muted" role="status">
          Chargement de vos annonces…
        </p>
      ) : listings.length === 0 ? (
        <EmptyState
          title="Vous n'avez pas encore d'annonce"
          action={
            <Link to="/listings/new" className="btn btn-primary">
              Publier une annonce
            </Link>
          }
        >
          Un objet qui dort dans un placard ? Donnez-lui une seconde vie.
        </EmptyState>
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} to={`/listings/${listing.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
