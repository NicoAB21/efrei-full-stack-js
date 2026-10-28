/* eslint-disable react-refresh/only-export-components -- Contexte et hook des favoris partagés. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiFetch } from './api'
import { useAuth } from './auth'
import { errorMessage } from './listings'
import { clearLocalFavorites, readLocalFavorites, writeLocalFavorites } from './favorites-merge'

// Source des favoris : le compte si l'utilisateur est connecté (API), sinon le navigateur (localStorage).
// À la connexion, les favoris du navigateur sont importés dans le compte puis effacés (spec 002, US4).

type Notice = { type: 'invite' | 'error'; text: string } | null
type Favorites = {
  ids: string[]
  isFavorite: (id: string) => boolean
  toggle: (id: string) => void
  notice: Notice
  dismissNotice: () => void
}

const FavoritesContext = createContext<Favorites | null>(null)
const INVITE_SHOWN_KEY = 'occaz.favorites.invite'

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [localIds, setLocalIds] = useState<string[]>(readLocalFavorites)
  const [notice, setNotice] = useState<Notice>(null)
  const ids = user ? accountIds : localIds
  const idsRef = useRef(ids)
  useEffect(() => {
    idsRef.current = ids
  }, [ids])

  // Connexion : import des favoris du navigateur, puis chargement de ceux du compte
  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      const local = readLocalFavorites()
      if (local.length > 0) {
        try {
          await apiFetch('/favorites/import', { method: 'POST', body: JSON.stringify({ listingIds: local }) })
          clearLocalFavorites()
          if (active) setLocalIds([])
        } catch {
          // L'import est un bonus : la connexion ne doit pas échouer pour lui
        }
      }
      try {
        const { items } = await apiFetch<{ items: { id: string }[] }>('/favorites')
        if (active) setAccountIds(items.map((item) => item.id))
      } catch (err) {
        if (active) setNotice({ type: 'error', text: errorMessage(err) })
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const toggle = useCallback(
    (id: string) => {
      const wasFavorite = idsRef.current.includes(id)
      const next = wasFavorite ? idsRef.current.filter((f) => f !== id) : [id, ...idsRef.current]

      if (!user) {
        setLocalIds(next)
        writeLocalFavorites(next)
        if (!wasFavorite && !sessionStorage.getItem(INVITE_SHOWN_KEY)) {
          sessionStorage.setItem(INVITE_SHOWN_KEY, '1')
          setNotice({ type: 'invite', text: 'Favori gardé sur cet appareil. Connectez-vous pour retrouver vos favoris partout.' })
        }
        return
      }

      setAccountIds(next) // mise à jour optimiste
      apiFetch(`/favorites/${id}`, { method: wasFavorite ? 'DELETE' : 'PUT' }).catch((err) => {
        // Retour arrière : l'API a refusé (annonce vendue, limite atteinte…)
        setAccountIds((current) => (wasFavorite ? [id, ...current.filter((f) => f !== id)] : current.filter((f) => f !== id)))
        setNotice({ type: 'error', text: errorMessage(err) })
      })
    },
    [user],
  )

  const value: Favorites = {
    ids,
    isFavorite: (id) => ids.includes(id),
    toggle,
    notice,
    dismissNotice: () => setNotice(null),
  }
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites doit être utilisé dans FavoritesProvider')
  return context
}

/** Props du cœur d'une carte ; rien sur ses propres annonces. */
export function useFavoriteProps() {
  const { isFavorite, toggle } = useFavorites()
  const { user } = useAuth()
  return (listing: { id: string; ownerId: string }) =>
    listing.ownerId === user?.id ? {} : { favorite: isFavorite(listing.id), onToggleFavorite: () => toggle(listing.id) }
}
