import { ArrowRight, MapPin, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { CategoryIcon } from '../components/CategoryIcon'
import { CommuneField, type CommuneChoice } from '../components/CommuneField'
import { EmptyState } from '../components/EmptyState'
import { ListingCard } from '../components/ListingCard'
import { CATEGORIES, type Category, type Listing } from '../constants'
import { useFavoriteProps } from '../favorites'
import { errorMessage } from '../listings'

// Accueil (US4) : une vitrine courte (catégories, dernières annonces, petits prix, villes).
// La recherche détaillée, avec tous les filtres, est sur /recherche.

const RECENT_COUNT = 10 // deux rangées de cinq sur ordinateur
const SMALL_PRICE = 4000 // « Petits prix » : 40 € maximum

const fetchPublic = async (query = '') => (await apiFetch<{ items: Listing[] }>(`/public/listings${query ? `?${query}` : ''}`)).items

export function Home() {
  const navigate = useNavigate()
  const favoriteProps = useFavoriteProps()
  const [recent, setRecent] = useState<Listing[] | null>(null)
  const [smallPrices, setSmallPrices] = useState<Listing[]>([])
  const [error, setError] = useState('')
  const [commune, setCommune] = useState<CommuneChoice | null>(null)

  useEffect(() => {
    let active = true
    fetchPublic()
      .then((items) => { if (active) setRecent(items) })
      .catch((cause: unknown) => { if (active) setError(errorMessage(cause)) })
    // Section facultative : masquée en cas d'erreur
    fetchPublic(`maxPrice=${SMALL_PRICE}&sort=price_asc`).then((items) => active && setSmallPrices(items.slice(0, 12))).catch(() => {})
    return () => { active = false }
  }, [])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params = new URLSearchParams()
    const q = String(data.get('q') ?? '').trim()
    if (q) params.set('q', q)
    // Suggestion choisie → toute la commune (tous codes postaux) ; sinon le texte tapé
    const city = commune?.name ?? String(data.get('city') ?? '').trim()
    if (city) params.set('city', city)
    if (commune) params.set('cityCode', commune.cityCode)
    navigate(`/recherche?${params}`)
  }

  const cities = recent ? topCities(recent) : []

  return (
    <div className="stack home" style={{ gap: 'var(--s-7)' }}>
      <section className="hero hero-compact" aria-labelledby="hero-title">
        <h1 id="hero-title">Des bonnes affaires près de chez vous</h1>
        <form className="hero-search" role="search" onSubmit={submitSearch}>
          <label>
            <Search size={18} aria-hidden />
            <span className="sr-only">Que cherchez-vous ?</span>
            <input name="q" placeholder="Que cherchez-vous ? Ex. vélo" maxLength={100} />
          </label>
          <CommuneField label="Ville" name="city" placeholder="Ville ou code postal" value={commune} onChange={setCommune} />
          <button type="submit" className="btn btn-primary">Rechercher</button>
        </form>
      </section>

      <section className="stack" aria-labelledby="cat-title">
        <h2 id="cat-title">Catégories</h2>
        <div className="category-tiles">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <Link key={c} to={`/recherche?category=${c}`} className="category-tile">
              <CategoryIcon category={c} size={26} strokeWidth={1.75} />
              {CATEGORIES[c]}
            </Link>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="recent-title">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 id="recent-title">Dernières annonces</h2>
          <Link to="/recherche" className="see-all">Voir toutes les annonces <ArrowRight size={16} aria-hidden /></Link>
        </div>
        {error ? (
          <Alert type="error">{error}</Alert>
        ) : recent === null ? (
          <p role="status" className="muted">Chargement des annonces…</p>
        ) : recent.length === 0 ? (
          <EmptyState title="Aucune annonce pour le moment" action={<Link to="/listings/new" className="btn btn-primary">Déposer une annonce</Link>}>
            Soyez le premier à vendre un objet.
          </EmptyState>
        ) : (
          <div className="listing-grid">
            {recent.slice(0, RECENT_COUNT).map((listing) => (
              <ListingCard key={listing.id} listing={listing} to={`/annonces/${listing.id}`} {...favoriteProps(listing)} />
            ))}
          </div>
        )}
      </section>

      {smallPrices.length > 0 && (
        <section className="stack" aria-labelledby="small-title">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <h2 id="small-title">Petits prix, 40 € maximum</h2>
            <Link to={`/recherche?maxPrice=${SMALL_PRICE}&sort=price_asc`} className="see-all">Tout voir <ArrowRight size={16} aria-hidden /></Link>
          </div>
          <div className="listing-row" tabIndex={0} aria-label="Annonces à petits prix, défilement horizontal">
            {smallPrices.map((listing) => (
              <ListingCard key={listing.id} listing={listing} to={`/annonces/${listing.id}`} {...favoriteProps(listing)} />
            ))}
          </div>
        </section>
      )}

      {cities.length > 0 && (
        <section className="stack" aria-labelledby="cities-title">
          <h2 id="cities-title">Villes populaires</h2>
          <div className="chips">
            {cities.map(({ name, cityCode, count }) => (
              <Link key={cityCode ?? name} to={`/recherche?${new URLSearchParams(cityCode ? { city: name, cityCode } : { city: name })}`} className="chip">
                <MapPin size={16} aria-hidden />
                {name}
                <span className="count">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="sell-banner" aria-labelledby="sell-title">
        <div>
          <h2 id="sell-title">C’est le moment de vendre</h2>
          <p>Déposez une annonce gratuitement, elle est en ligne en quelques minutes.</p>
        </div>
        <Link to="/listings/new" className="btn btn-primary">Déposer une annonce</Link>
      </section>
    </div>
  )
}

/** Les 8 communes les plus fréquentes (regroupées par code officiel ; texte pour les anciennes annonces). */
function topCities(items: Listing[]) {
  const groups = new Map<string, { name: string; cityCode: string | null; count: number }>()
  for (const { city, cityCode } of items) {
    const key = cityCode ?? city.toLowerCase()
    const group = groups.get(key) ?? { name: city, cityCode, count: 0 }
    group.count += 1
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr')).slice(0, 8)
}
