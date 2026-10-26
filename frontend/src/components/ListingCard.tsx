import { Link } from 'react-router'
import type { Listing } from '../constants'
import { CategoryIcon } from './CategoryIcon'
import { PriceTag } from './PriceTag'

type Props = {
  listing: Pick<Listing, 'title' | 'priceCents' | 'category' | 'city' | 'status' | 'createdAt'>
  /** Lien vers le détail : toute la carte devient cliquable */
  to: string
}

const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Carte d'annonce : prix en étiquette en haut à gauche, tampon « Vendu » si vendue. */
export function ListingCard({ listing, to }: Props) {
  const sold = listing.status === 'sold'
  return (
    <article className={`listing-card ${sold ? 'is-sold' : ''}`}>
      <div className="media">
        <PriceTag cents={listing.priceCents} sold={sold} />
        {sold && <span className="stamp">Vendu</span>}
        <CategoryIcon category={listing.category} size={48} strokeWidth={1.5} />
      </div>
      <h3>
        <Link to={to}>{listing.title}</Link>
      </h3>
      <p className="meta">
        {listing.city} · {date.format(new Date(listing.createdAt))}
      </p>
    </article>
  )
}
