import { Link } from 'react-router'

/** Le nom dans une étiquette orange, point bleu nuit. Lien vers l'accueil. */
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Occaz, accueil">
      occaz
    </Link>
  )
}
