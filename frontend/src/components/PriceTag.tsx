import { formatPrice } from '../price'

type Props = {
  cents: number
  /** `lg` sur la page de détail */
  size?: 'md' | 'lg'
  /** Étiquette grise pour une annonce vendue */
  sold?: boolean
}

/** La signature d'Occaz : le prix dans une étiquette percée. */
export function PriceTag({ cents, size = 'md', sold = false }: Props) {
  return (
    <span className={`price-tag ${size === 'lg' ? 'price-tag-lg' : ''} ${sold ? 'price-tag-sold' : ''}`}>
      {formatPrice(cents)}
    </span>
  )
}
