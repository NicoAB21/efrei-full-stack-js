import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Alert } from '../components/Alert'
import { BackLink } from '../components/BackLink'
import { Button } from '../components/Button'
import { PriceTag } from '../components/PriceTag'
import { StatusBadge } from '../components/StatusBadge'
import { CATEGORIES, type Listing } from '../constants'
import { deleteListing, errorMessage, fetchListing, loadErrorMessage, updateListing } from '../listings'

const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export function ListingDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const flash = (useLocation().state as { message?: string } | null)?.message
  const [listing, setListing] = useState<Listing | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
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
        if (active) setLoadError(loadErrorMessage(e))
      })
    return () => {
      active = false
    }
  }, [id])

  if (loadError) {
    return (
      <div className="stack" style={{ maxWidth: 640, marginInline: 'auto' }}>
        <BackLink to="/listings">Mes annonces</BackLink>
        <h1>Annonce introuvable</h1>
        <Alert type="error">{loadError}</Alert>
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

  return (
    <div className="stack" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <BackLink to="/listings">Mes annonces</BackLink>

      {(success ?? flash) && <Alert type="success">{success ?? flash}</Alert>}
      {actionError && <Alert type="error">{actionError}</Alert>}

      <article className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={listing.status} />
          <span className="muted small">Publiée le {longDate.format(new Date(listing.createdAt))}</span>
        </div>
        <h1>{listing.title}</h1>
        <div style={{ ['--hole-bg' as string]: 'var(--surface)' }}>
          <PriceTag cents={listing.priceCents} size="lg" sold={sold} />
        </div>
        <div className="facts">
          <div>
            Catégorie<b>{CATEGORIES[listing.category]}</b>
          </div>
          <div>
            Ville<b>{listing.city}</b>
          </div>
          <div>
            Modifiée le<b>{longDate.format(new Date(listing.updatedAt))}</b>
          </div>
        </div>
        {listing.description ? (
          <p style={{ whiteSpace: 'pre-line' }}>{listing.description}</p>
        ) : (
          <p className="muted">Pas de description.</p>
        )}

        <div className="row">
          <Link to={`/listings/${listing.id}/edit`} className="btn btn-secondary">
            <Pencil size={18} aria-hidden />
            Modifier
          </Link>
          <Button variant="night" loading={busy === 'status'} disabled={busy !== null} onClick={() => toggleStatus(listing)}>
            {sold ? 'Remettre en vente' : 'Marquer comme vendue'}
          </Button>
          <Button variant="danger" loading={busy === 'delete'} disabled={busy !== null} onClick={() => remove(listing)}>
            <Trash2 size={18} aria-hidden />
            Supprimer
          </Button>
        </div>
      </article>
    </div>
  )
}
