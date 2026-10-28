import { X } from 'lucide-react'
import { Link } from 'react-router'
import { useFavorites } from '../favorites'

/** Message des favoris en bas d'écran : invitation à se connecter, ou erreur (annonce vendue, limite…). */
export function FavoritesNotice() {
  const { notice, dismissNotice } = useFavorites()
  return (
    <div className="toast-region" aria-live="polite">
      {notice && (
        <div className={`toast toast-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>
            {notice.text}{' '}
            {notice.type === 'invite' && <Link to="/login" onClick={dismissNotice}>Se connecter</Link>}
          </span>
          <button type="button" className="icon-btn" aria-label="Fermer le message" onClick={dismissNotice}>
            <X size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
