import { MessageCircle } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'

type Props = {
  listingId: string
  /** Bouton principal (annonce non achetable en ligne) ou secondaire (à côté de « Acheter ») */
  primary: boolean
  connected: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * « Contacter le vendeur » sur la page produit.
 * US5 (Ismael, T051) : remplacer le contenu du panneau `.contact-panel` par le formulaire de message
 * (POST /api/public/listings/:id/messages, `listingId` ci-dessus) ; le bouton et la mise en page restent tels quels.
 */
export function ContactSeller({ listingId, primary, connected, open, onOpenChange }: Props) {
  const panelId = useId()
  const className = `btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-block`
  if (!connected) {
    return (
      <Link to="/login" className={className}>
        <MessageCircle size={18} aria-hidden />
        Se connecter pour contacter le vendeur
      </Link>
    )
  }
  return (
    <>
      <button type="button" id={`contact-${listingId}`} className={className} aria-expanded={open} aria-controls={panelId} onClick={() => onOpenChange(!open)}>
        <MessageCircle size={18} aria-hidden />
        Contacter le vendeur
      </button>
      {open && (
        <div id={panelId} className="contact-panel" role="region" aria-label="Contacter le vendeur">
          <strong>La messagerie arrive bientôt</strong>
          <p className="muted small">Vous pourrez écrire au vendeur directement depuis cette page, sans partager votre email.</p>
        </div>
      )}
    </>
  )
}
