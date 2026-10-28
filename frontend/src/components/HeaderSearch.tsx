import { Search } from 'lucide-react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** Recherche de l'en-tête, sur toutes les pages : ouvre /recherche (en gardant les filtres si on y est déjà). */
export function HeaderSearch() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const onResults = pathname === '/recherche'
  const current = onResults ? (new URLSearchParams(search).get('q') ?? '') : ''

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    const params = new URLSearchParams(onResults ? search : '')
    if (q) params.set('q', q)
    else params.delete('q')
    params.delete('page')
    const query = params.toString()
    navigate(`/recherche${query ? `?${query}` : ''}`)
  }

  return (
    // key : le champ reprend la recherche de l'URL quand on navigue
    <form key={current} className="header-search" role="search" onSubmit={submit}>
      <label htmlFor="header-q" className="sr-only">Rechercher une annonce</label>
      <input id="header-q" name="q" type="search" placeholder="Rechercher sur Occaz" maxLength={100} defaultValue={current} />
      <button type="submit" aria-label="Rechercher">
        <Search size={18} aria-hidden />
      </button>
    </form>
  )
}
