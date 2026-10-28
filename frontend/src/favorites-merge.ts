// Favoris du visiteur, gardés dans le navigateur ; importés dans le compte à la connexion (spec 002, US4).

export const LOCAL_FAVORITES_KEY = 'occaz.favorites'
export const MAX_FAVORITES = 200

const OBJECT_ID = /^[a-f0-9]{24}$/i

/** Ids valides, sans doublon, 200 au plus ; tolère un contenu illisible. */
export function parseLocalFavorites(raw: string | null): string[] {
  let value: unknown
  try {
    value = JSON.parse(raw ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  const ids = value.filter((v): v is string => typeof v === 'string' && OBJECT_ID.test(v))
  return [...new Set(ids)].slice(0, MAX_FAVORITES)
}

export const readLocalFavorites = () => parseLocalFavorites(localStorage.getItem(LOCAL_FAVORITES_KEY))
export const writeLocalFavorites = (ids: string[]) => localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(ids))
export const clearLocalFavorites = () => localStorage.removeItem(LOCAL_FAVORITES_KEY)
