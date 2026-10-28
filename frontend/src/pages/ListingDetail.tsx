import { Clock, Eye, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Alert } from '../components/Alert'
import { BackLink } from '../components/BackLink'
import { Button } from '../components/Button'
import { Gallery } from '../components/Gallery'
import { PriceTag } from '../components/PriceTag'
import { StatusBadge } from '../components/StatusBadge'
import { CATEGORIES, type Listing } from '../constants'
import { formatPrice } from '../price'
import { deleteListing, errorMessage, fetchListing, isNotFound, loadErrorMessage, updateListing } from '../listings'

const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export function ListingDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const flash = (useLocation().state as { message?: string } | null)?.message
  const [listing, setListing] = useState<Listing | null>(null)
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState<'status' | 'delete' | null>(null)

  useEffect(() => {
    let active = true
    fetchListing(id)
      .then((found) => {
        if (active) setListing(found)
      })
      .catch((e: unknown) => {
        if (active) setLoadError({ notFound: isNotFound(e), message: loadErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [id])

  if (loadError) {
    return (
      <div className="stack" style={{ maxWidth: 640, marginInline: 'auto' }}>
        <BackLink to="/listings">Mes annonces</BackLink>
        <h1>{loadError.notFound ? 'Annonce introuvable' : "Impossible de charger l'annonce"}</h1>
        <Alert type="error">{loadError.message}</Alert>
      </div>
    )
  }

  if (!listing) {
    return (
      <p className="muted" role="status">
        Chargement de l'annonce…
      </p>
    )
  }

  const sold = listing.status === 'sold'

  async function toggleStatus(current: Listing) {
    setBusy('status')
    setActionError(null)
    setSuccess(null)
    try {
      const updated = await updateListing(current.id, { status: current.status === 'sold' ? 'available' : 'sold' })
      setListing(updated)
      setSuccess(updated.status === 'sold' ? 'Annonce marquée comme vendue.' : 'Annonce remise en vente.')
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  async function remove(current: Listing) {
    if (!window.confirm(`Supprimer définitivement « ${current.title} » ? Cette action est irréversible.`)) return
    setBusy('delete')
    setActionError(null)
    setSuccess(null)
    try {
      await deleteListing(current.id)
      navigate('/listings', { state: { message: `Annonce « ${current.title} » supprimée.` } })
    } catch (e) {
      setActionError(errorMessage(e))
      setBusy(null)
    }
  }

  const place = `${listing.city}${listing.postalCode ? ` (${listing.postalCode})` : ''}`

  return (
    <div className="product">
      <BackLink to="/listings">Mes annonces</BackLink>

      {(success ?? flash) && <Alert type="success">{success ?? flash}</Alert>}
      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="product-layout">
        <div className="product-gallery">
          <Gallery photos={listing.photos ?? []} title={listing.title} category={listing.category} />
        </div>

        <aside className="product-aside" aria-label="Prix et gestion">
          <div className="panel">
            <StatusBadge status={listing.status} />
            <h1 className="product-title">{listing.title}</h1>
            <div style={{ ['--hole-bg' as string]: 'var(--surface)' }}>
              <PriceTag cents={listing.priceCents} size="lg" sold={sold} />
            </div>
            <ul className="product-meta">
              <li><MapPin size={16} aria-hidden /> {place}</li>
              <li><Clock size={16} aria-hidden /> Publiée le {longDate.format(new Date(listing.createdAt))}</li>
            </ul>

            {listing.soldOnline && (
              <Alert type="success">
                Vendue en ligne le {longDate.format(new Date(listing.soldOnline.at))} pour {formatPrice(listing.soldOnline.priceCents)}.
              </Alert>
            )}

            <div className="stack" style={{ gap: 'var(--s-2)' }}>
              <Link to={`/listings/${listing.id}/edit`} className="btn btn-primary btn-block">
                <Pencil size={18} aria-hidden />
                Modifier l’annonce
              </Link>
              {/* Vente en ligne définitive (spec 005) : pas de remise en vente */}
              {!listing.soldOnline && (
                <Button variant="night" className="btn-block" loading={busy === 'status'} disabled={busy !== null} onClick={() => toggleStatus(listing)}>
                  {sold ? 'Remettre en vente' : 'Marquer comme vendue'}
                </Button>
              )}
              {!sold && (
                <Link to={`/annonces/${listing.id}`} className="btn btn-secondary btn-block">
                  <Eye size={18} aria-hidden />
                  Voir comme un acheteur
                </Link>
              )}
              <Button variant="danger" className="btn-block" loading={busy === 'delete'} disabled={busy !== null} onClick={() => remove(listing)}>
                <Trash2 size={18} aria-hidden />
                Supprimer
              </Button>
            </div>
          </div>
        </aside>

        <div className="product-details stack">
          <section className="panel" aria-labelledby="desc-title">
            <h2 id="desc-title" className="h3">Description</h2>
            {listing.description ? (
              <p className="product-description">{listing.description}</p>
            ) : (
              <p className="muted">Pas de description : ajoutez-en une, les annonces détaillées se vendent mieux.</p>
            )}
          </section>
          <section className="panel" aria-labelledby="criteria-title">
            <h2 id="criteria-title" className="h3">Critères</h2>
            <dl className="facts">
              <div><dt>Catégorie</dt><dd>{CATEGORIES[listing.category]}</dd></div>
              <div><dt>Commune</dt><dd>{place}</dd></div>
              <div><dt>Publiée le</dt><dd>{longDate.format(new Date(listing.createdAt))}</dd></div>
              <div><dt>Modifiée le</dt><dd>{longDate.format(new Date(listing.updatedAt))}</dd></div>
              <div><dt>Photos</dt><dd>{listing.photos?.length ?? 0} / 5</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
