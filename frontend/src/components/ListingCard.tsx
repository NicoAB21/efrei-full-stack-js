import { Heart } from 'lucide-react'
import { Link } from 'react-router'
import type { Listing, Photo } from '../constants'
import { CategoryIcon } from './CategoryIcon'
import { PriceTag } from './PriceTag'

type Props = {
  listing: Pick<Listing, 'title' | 'priceCents' | 'category' | 'city' | 'status' | 'createdAt'> & { photos?: Photo[] }
  /** Lien vers le détail : toute la carte devient cliquable ; absent = carte non cliquable (ex. favori vendu) */
  to?: string
  /** Bouton cœur affiché seulement si onToggleFavorite est fourni (favoris : pas encore dans le modèle) */
  favorite?: boolean
  onToggleFavorite?: () => void
}

const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Carte d'annonce : photo principale (ou pictogramme), prix en étiquette, tampon « Vendu » si vendue. */
export function ListingCard({ listing, to, favorite = false, onToggleFavorite }: Props) {
  const sold = listing.status === 'sold'
  const cover = listing.photos?.[0] // photo principale, sinon pictogramme de la catégorie
  return (
    <article className={`listing-card ${sold ? 'is-sold' : ''}`}>
      <div className={`media ${cover ? 'has-photo' : ''}`}>
        <PriceTag cents={listing.priceCents} sold={sold} />
        {sold && <span className="stamp">Vendu</span>}
        {cover ? (
          <img src={cover.cardUrl} alt="" loading="lazy" width={cover.width} height={cover.height} />
        ) : (
          <CategoryIcon category={listing.category} size={48} strokeWidth={1.5} />
        )}
      </div>
      {onToggleFavorite && (
        <button
          type="button"
          className="fav-btn"
          aria-pressed={favorite}
          aria-label={favorite ? `Retirer « ${listing.title} » des favoris` : `Ajouter « ${listing.title} » aux favoris`}
          onClick={onToggleFavorite}
        >
          <Heart size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden />
        </button>
      )}
      <h3>
        {to ? <Link to={to}>{listing.title}</Link> : listing.title}
      </h3>
      <p className="meta">
        {listing.city} · {date.format(new Date(listing.createdAt))}
      </p>
    </article>
  )
}
