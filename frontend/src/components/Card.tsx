import { Link } from 'react-router'
import { CATEGORIES, STATUSES, type Listing } from '../constants'
import { formatPrice } from '../price'

type Props = {
  listing: Pick<Listing, 'title' | 'priceCents' | 'category' | 'city' | 'status'>
  /** Lien vers le détail : toute la carte devient cliquable */
  to?: string
}

/** Aperçu d'une annonce (listes « Mes annonces » et vitrine). */
export function Card({ listing, to }: Props) {
  return (
    <article className="card">
      <h3>{to ? <Link to={to}>{listing.title}</Link> : listing.title}</h3>
      <p className="card-price">{formatPrice(listing.priceCents)}</p>
      <p className="card-meta">
        {CATEGORIES[listing.category]} · {listing.city}
      </p>
      <span className={`badge badge-${listing.status}`}>{STATUSES[listing.status]}</span>
    </article>
  )
}
