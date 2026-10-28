import { FlaskConical } from 'lucide-react'

/** Mention obligatoire sur tout le parcours d'achat (spec 005, FR-010). */
export function DemoBanner() {
  return (
    <p className="demo-banner" role="note">
      <FlaskConical size={18} aria-hidden />
      Paiement de démonstration, aucun débit réel
    </p>
  )
}
