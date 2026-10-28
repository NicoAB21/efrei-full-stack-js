import { Clock, Heart, MapPin, Settings2, Share2, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { BackLink } from '../components/BackLink'
import { Button } from '../components/Button'
import { ContactSeller } from '../components/ContactSeller'
import { Gallery } from '../components/Gallery'
import { ListingCard } from '../components/ListingCard'
import { PriceTag } from '../components/PriceTag'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../auth'
import { CATEGORIES, type Listing } from '../constants'
import { useFavoriteProps, useFavorites } from '../favorites'
import { errorMessage, isNotFound } from '../listings'
import { formatPrice } from '../price'

// Page produit, inspirée des grands sites entre particuliers : photos à gauche, encadré d'achat collant à droite
// (prix, actions, vendeur), critères et description dessous, puis annonces du vendeur et annonces similaires.

const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })
const STRIP_SIZE = 4

const fetchPublic = (query: string) => apiFetch<{ items: Listing[] }>(`/public/listings?${query}`).then((r) => r.items)

export function PublicListing() {
  const { id = '' } = useParams()
  return <Detail key={id} id={id} />
}

function Detail({ id }: { id: string }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const favoriteProps = useFavoriteProps()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<{ message: string; missing: boolean } | null>(null)
  const [sellerItems, setSellerItems] = useState<Listing[]>([])
  const [similar, setSimilar] = useState<Listing[]>([])
  const cancelled = useSearchParams()[0].get('paiement') === 'annule'
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [shared, setShared] = useState('')

  useEffect(() => {
    let active = true
    apiFetch<Listing>(`/public/listings/${encodeURIComponent(id)}`)
      .then((found) => {
        if (!active) return
        setListing(found)
        // Compléments non bloquants : une erreur ici laisse simplement les sections vides
        fetchPublic(`ownerId=${found.ownerId}`).then((items) => active && setSellerItems(items)).catch(() => {})
        fetchPublic(`category=${found.category}`).then((items) => active && setSimilar(items)).catch(() => {})
      })
      .catch((cause: unknown) => {
        if (active) setError({ message: errorMessage(cause), missing: isNotFound(cause) })
      })
    return () => { active = false }
  }, [id])

  // Le serveur fixe le prix et renvoie la page de paiement Stripe (spec 005)
  async function buy() {
    setBuying(true)
    setBuyError('')
    try {
      const { url } = await apiFetch<{ url: string }>('/purchases', { method: 'POST', body: JSON.stringify({ listingId: id }) })
      window.location.assign(url)
    } catch (cause) {
      setBuyError(errorMessage(cause))
      setBuying(false)
    }
  }

  async function share(title: string) {
    const url = window.location.href.split('?')[0]
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared('Lien copié')
        setTimeout(() => setShared(''), 2500)
      }
    } catch {
      // partage annulé par l'utilisateur : rien à faire
    }
  }

  // Ouvre le contact depuis la barre mobile et amène l'encadré à l'écran
  function openContact() {
    setContactOpen(true)
    document.getElementById(`contact-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (error || !listing) {
    return (
      <div className="stack" style={{ maxWidth: 640, marginInline: 'auto' }}>
        <BackLink to="/">Toutes les annonces</BackLink>
        {error ? (
          <>
            <h1>{error.missing ? 'Annonce introuvable' : 'Impossible de charger l’annonce'}</h1>
            <Alert type="error">{error.missing ? 'Cette annonce n’est plus disponible.' : error.message}</Alert>
          </>
        ) : (
          <p role="status" className="muted">Chargement de l’annonce…</p>
        )}
      </div>
    )
  }

  const mine = listing.ownerId === user?.id
  const buyable = Boolean(listing.buyable) && !mine
  const others = sellerItems.filter((l) => l.id !== listing.id)
  const related = similar.filter((l) => l.id !== listing.id && l.ownerId !== listing.ownerId).slice(0, STRIP_SIZE)
  const place = `${listing.city}${listing.postalCode ? ` (${listing.postalCode})` : ''}`
  const favorite = isFavorite(listing.id)

  return (
    <div className={`product ${mine ? '' : 'has-bar'}`}>
      <nav aria-label="Fil d’Ariane" className="breadcrumb">
        <ol>
          <li><Link to="/">Annonces</Link></li>
          <li><Link to={`/?category=${listing.category}`}>{CATEGORIES[listing.category]}</Link></li>
          <li aria-current="page">{listing.title}</li>
        </ol>
      </nav>

      {cancelled && <Alert type="success">Paiement annulé : l’annonce est toujours disponible.</Alert>}

      <div className="product-layout">
        <div className="product-gallery">
          <Gallery photos={listing.photos ?? []} title={listing.title} category={listing.category} />
        </div>

        <aside className="product-aside" aria-label="Prix et actions">
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <StatusBadge status={listing.status} />
              <div className="row" style={{ gap: 4 }}>
                {!mine && (
                  <button type="button" className="icon-btn" aria-pressed={favorite} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => toggle(listing.id)}>
                    <Heart size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden />
                  </button>
                )}
                <button type="button" className="icon-btn" aria-label="Partager l’annonce" onClick={() => share(listing.title)}>
                  <Share2 size={20} aria-hidden />
                </button>
              </div>
            </div>
            <h1 className="product-title">{listing.title}</h1>
            <PriceTag cents={listing.priceCents} size="lg" />
            <ul className="product-meta">
              <li><MapPin size={16} aria-hidden /> {place}</li>
              <li><Clock size={16} aria-hidden /> Publiée le {longDate.format(new Date(listing.createdAt))}</li>
            </ul>
            <span className="sr-only" role="status">{shared}</span>
            {shared && <p className="muted small" aria-hidden>{shared}</p>}

            {mine ? (
              <div className="stack" style={{ gap: 'var(--s-2)' }}>
                <p className="muted small">C’est votre annonce : voici ce que voient les acheteurs.</p>
                <Link to={`/listings/${listing.id}`} className="btn btn-night btn-block">
                  <Settings2 size={18} aria-hidden />
                  Gérer mon annonce
                </Link>
              </div>
            ) : (
              <div className="stack" style={{ gap: 'var(--s-2)' }}>
                {buyable && (
                  <>
                    {buyError && <Alert type="error">{buyError}</Alert>}
                    {user ? (
                      <Button variant="primary" className="btn-block" loading={buying} onClick={buy}>
                        <ShoppingBag size={18} aria-hidden />
                        Acheter
                      </Button>
                    ) : (
                      <Link to="/login" className="btn btn-primary btn-block">
                        <ShoppingBag size={18} aria-hidden />
                        Se connecter pour acheter
                      </Link>
                    )}
                  </>
                )}
                <ContactSeller listingId={listing.id} primary={!buyable} connected={Boolean(user)} open={contactOpen} onOpenChange={setContactOpen} />
                {buyable ? (
                  <p className="muted small row" style={{ gap: 6 }}><ShieldCheck size={16} aria-hidden /> Paiement sécurisé par carte bancaire</p>
                ) : (
                  <p className="muted small">Cet article se règle directement avec le vendeur.</p>
                )}
              </div>
            )}
          </div>

          <section className="panel seller-card" aria-labelledby="seller-title">
            <span className="seller-avatar" aria-hidden><UserRound size={22} /></span>
            <div>
              <h2 id="seller-title" className="h3">{mine ? 'Vous' : 'Vendeur particulier'}</h2>
              <p className="muted small">
                {sellerItems.length} annonce{sellerItems.length > 1 ? 's' : ''} en ligne
              </p>
            </div>
            {others.length > 0 && <a href="#autres-annonces" className="small">Voir ses annonces</a>}
          </section>
        </aside>

        <div className="product-details stack">
          <section className="panel" aria-labelledby="desc-title">
            <h2 id="desc-title" className="h3">Description</h2>
            <p className="product-description">{listing.description || 'Le vendeur n’a pas ajouté de description.'}</p>
          </section>

          <section className="panel" aria-labelledby="criteria-title">
            <h2 id="criteria-title" className="h3">Critères</h2>
            <dl className="facts">
              <div><dt>Catégorie</dt><dd>{CATEGORIES[listing.category]}</dd></div>
              <div><dt>Prix</dt><dd>{formatPrice(listing.priceCents)}</dd></div>
              <div><dt>Commune</dt><dd>{place}</dd></div>
              <div><dt>Publiée le</dt><dd>{longDate.format(new Date(listing.createdAt))}</dd></div>
              <div><dt>Mise à jour</dt><dd>{longDate.format(new Date(listing.updatedAt))}</dd></div>
              <div><dt>Photos</dt><dd>{listing.photos?.length ?? 0}</dd></div>
            </dl>
          </section>

          {!mine && (
            <section className="panel safety" aria-labelledby="safety-title">
              <h2 id="safety-title" className="h3"><ShieldCheck size={20} aria-hidden /> Conseils de sécurité</h2>
              <ul>
                <li>Échangez avec le vendeur par la messagerie d’Occaz : ne communiquez ni code ni coordonnées bancaires.</li>
                <li>Pour une remise en main propre, donnez rendez-vous dans un lieu public et vérifiez l’objet avant de payer.</li>
                <li>Méfiez-vous d’un prix anormalement bas ou d’une demande de paiement par un autre moyen.</li>
              </ul>
            </section>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <ListingStrip id="autres-annonces" title={mine ? 'Vos autres annonces' : 'Les autres annonces de ce vendeur'} items={others.slice(0, STRIP_SIZE)} favoriteProps={favoriteProps} />
      )}
      {related.length > 0 && (
        <ListingStrip id="similaires" title="Ces annonces peuvent vous intéresser" items={related} favoriteProps={favoriteProps} />
      )}

      {/* Mobile : prix et action principale toujours à portée de pouce */}
      {!mine && (
        <div className="product-bar">
          <div>
            <strong>{formatPrice(listing.priceCents)}</strong>
            <span className="muted small">{listing.title}</span>
          </div>
          {!user ? (
            <Link to="/login" className="btn btn-primary">{buyable ? 'Acheter' : 'Contacter'}</Link>
          ) : buyable ? (
            <Button variant="primary" loading={buying} onClick={buy}>Acheter</Button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={openContact}>Contacter</button>
          )}
        </div>
      )}
    </div>
  )
}

type StripProps = {
  id: string
  title: string
  items: Listing[]
  favoriteProps: ReturnType<typeof useFavoriteProps>
}

function ListingStrip({ id, title, items, favoriteProps }: StripProps) {
  return (
    <section id={id} className="product-strip" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <div className="listing-grid">
        {items.map((item) => (
          <ListingCard key={item.id} listing={item} to={`/annonces/${item.id}`} {...favoriteProps(item)} />
        ))}
      </div>
    </section>
  )
}
