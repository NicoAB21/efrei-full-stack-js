import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { BackLink } from '../components/BackLink'
import { PriceTag } from '../components/PriceTag'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../auth'
import { CATEGORIES, type Listing } from '../constants'
import { useFavorites } from '../favorites'
import { errorMessage, isNotFound } from '../listings'

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export function PublicListing() {
  const { id = '' } = useParams()
  return <Detail key={id} id={id} />
}

function Detail({ id }: { id: string }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<{ message: string; missing: boolean } | null>(null)
  useEffect(() => {
    let active = true
    apiFetch<Listing>(`/public/listings/${encodeURIComponent(id)}`)
      .then((result) => { if (active) setListing(result) })
      .catch((cause: unknown) => {
        if (active) setError({ message: errorMessage(cause), missing: isNotFound(cause) })
      })
    return () => { active = false }
  }, [id])

  return (
    <div className="stack" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <BackLink to="/">Toutes les annonces</BackLink>
      {error ? (
        <>
          <h1>{error.missing ? 'Annonce introuvable' : 'Impossible de charger l’annonce'}</h1>
          <Alert type="error">{error.missing ? 'Cette annonce n’est plus disponible.' : error.message}</Alert>
        </>
      ) : !listing ? (
        <p role="status" className="muted">Chargement de l’annonce…</p>
      ) : (
        <article className="panel">
          <StatusBadge status={listing.status} />
          <h1>{listing.title}</h1>
          <PriceTag cents={listing.priceCents} size="lg" />
          <div className="facts">
            <div>Catégorie<b>{CATEGORIES[listing.category]}</b></div>
            <div>Ville<b>{listing.city}</b></div>
            <div>Publiée le<b>{date.format(new Date(listing.createdAt))}</b></div>
          </div>
          <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
            {listing.description || 'Pas de description.'}
          </p>
          {listing.ownerId !== user?.id && (
            <div className="row">
              <button type="button" className="btn btn-secondary" aria-pressed={isFavorite(listing.id)} onClick={() => toggle(listing.id)}>
                <Heart size={18} fill={isFavorite(listing.id) ? 'currentColor' : 'none'} aria-hidden />
                {isFavorite(listing.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </button>
            </div>
          )}
        </article>
      )}
    </div>
  )
}
