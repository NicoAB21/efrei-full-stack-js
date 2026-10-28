import { SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { CategoryIcon } from '../components/CategoryIcon'
import { CommuneField, type CommuneChoice } from '../components/CommuneField'
import { EmptyState } from '../components/EmptyState'
import { ListingCard } from '../components/ListingCard'
import { CATEGORIES, type Category, type Listing } from '../constants'
import { useFavoriteProps } from '../favorites'
import { errorMessage } from '../listings'
import { formatPrice, parsePrice, toPriceInput } from '../price'

// Page de résultats (/recherche) : filtres détaillés à gauche, résultats triés et paginés à droite.
// Tout l'état vit dans l'URL : ?q=&category=&city=&cityCode=&minPrice=&maxPrice=&buyable=1&photos=1&sort=&page=

const PAGE_SIZE = 50 // taille de page de l'API
const SORTS = { recent: 'Plus récentes', price_asc: 'Prix croissant', price_desc: 'Prix décroissant' } as const
// Fourchettes rapides, en centimes
const RANGES = [
  { label: 'Moins de 20 €', min: null, max: 2000 },
  { label: '20 à 100 €', min: 2000, max: 10000 },
  { label: '100 à 500 €', min: 10000, max: 50000 },
  { label: 'Plus de 500 €', min: 50000, max: null },
]

type Result = { items: Listing[]; total: number }

export function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  // key : remonte la page à chaque recherche pour réinitialiser les champs sur l'URL
  return <Results key={query} query={query} setParams={setParams} />
}

function Results({ query, setParams }: { query: string; setParams: (p: URLSearchParams) => void }) {
  const params = new URLSearchParams(query)
  const favoriteProps = useFavoriteProps()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [priceError, setPriceError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [commune, setCommune] = useState<CommuneChoice | null>(() => {
    const code = params.get('cityCode')
    const name = params.get('city') ?? ''
    return code ? { cityCode: code, postalCode: '', name, label: name } : null
  })

  useEffect(() => {
    let active = true
    apiFetch<Result>(`/public/listings${query ? `?${query}` : ''}`)
      .then((r) => { if (active) setResult(r) })
      .catch((cause: unknown) => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [query])

  /** Change des filtres (null = retirer), revient à la page 1 sauf si on change de page. */
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(query)
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
    window.scrollTo({ top: 0 })
  }

  function chooseCommune(choice: CommuneChoice | null) {
    setCommune(choice)
    if (choice) update({ city: choice.name, cityCode: choice.cityCode })
  }

  function submitPrices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const prices: Record<string, string | null> = {}
    for (const key of ['minPrice', 'maxPrice']) {
      const value = String(data.get(key) ?? '').trim()
      if (!value) {
        prices[key] = null
        continue
      }
      const cents = parsePrice(value)
      if (cents === null) return setPriceError('Prix invalide')
      prices[key] = String(cents)
    }
    if (prices.minPrice && prices.maxPrice && Number(prices.minPrice) > Number(prices.maxPrice)) {
      return setPriceError('Le minimum dépasse le maximum')
    }
    setPriceError('')
    update(prices)
  }

  const price = (key: string) => {
    const value = Number(params.get(key))
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }
  const minPrice = price('minPrice')
  const maxPrice = price('maxPrice')
  const category = params.get('category') as Category | null
  const q = params.get('q')
  const sort = (params.get('sort') ?? 'recent') as keyof typeof SORTS
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1

  // Filtres actifs, retirables un par un
  const active: { label: string; remove: Record<string, null> }[] = []
  if (q) active.push({ label: `« ${q} »`, remove: { q: null } })
  if (category) active.push({ label: CATEGORIES[category], remove: { category: null } })
  if (params.get('city')) active.push({ label: params.get('city') as string, remove: { city: null, cityCode: null } })
  if (minPrice || maxPrice) {
    const label = minPrice && maxPrice ? `${formatPrice(minPrice)} à ${formatPrice(maxPrice)}` : minPrice ? `Dès ${formatPrice(minPrice)}` : `Jusqu’à ${formatPrice(maxPrice as number)}`
    active.push({ label, remove: { minPrice: null, maxPrice: null } })
  }
  if (params.get('buyable')) active.push({ label: 'Achat en ligne', remove: { buyable: null } })
  if (params.get('photos')) active.push({ label: 'Avec photos', remove: { photos: null } })

  const title = q ? `« ${q} »` : category ? CATEGORIES[category] : 'Toutes les annonces'

  return (
    <div className="search-page">
      <div className="search-head">
        <h1>{title}</h1>
        {result && (
          <p className="muted" role="status">
            {result.total} annonce{result.total > 1 ? 's' : ''}
            {params.get('city') && ` à ${params.get('city')}`}
          </p>
        )}
        <button type="button" className="btn btn-secondary btn-sm filters-toggle" aria-expanded={filtersOpen} aria-controls="filters" onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal size={16} aria-hidden />
          Filtres{active.length > 0 && ` (${active.length})`}
        </button>
      </div>

      <div className="search-layout">
        <aside className={`filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Filtres" id="filters">
          <fieldset className="filter-group">
            <legend>Catégorie</legend>
            <ul className="filter-options">
              <li>
                <label>
                  <input type="radio" name="category" checked={!category} onChange={() => update({ category: null })} />
                  Toutes les catégories
                </label>
              </li>
              {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                <li key={c}>
                  <label>
                    <input type="radio" name="category" checked={category === c} onChange={() => update({ category: c })} />
                    <CategoryIcon category={c} size={16} aria-hidden />
                    {CATEGORIES[c]}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="filter-group">
            <legend>Localisation</legend>
            <CommuneField label="Ville ou code postal" name="city" placeholder="Ex. Lyon ou 69003" value={commune} onChange={chooseCommune} initialText={params.get('city') ?? ''} />
          </fieldset>

          <fieldset className="filter-group">
            <legend>Prix</legend>
            <form className="price-row" onSubmit={submitPrices} noValidate>
              <label>
                <span className="sr-only">Prix minimum en euros</span>
                <input name="minPrice" inputMode="decimal" placeholder="Min" defaultValue={minPrice ? toPriceInput(minPrice) : ''} aria-invalid={priceError ? true : undefined} />
                <span aria-hidden>€</span>
              </label>
              <span aria-hidden>–</span>
              <label>
                <span className="sr-only">Prix maximum en euros</span>
                <input name="maxPrice" inputMode="decimal" placeholder="Max" defaultValue={maxPrice ? toPriceInput(maxPrice) : ''} aria-invalid={priceError ? true : undefined} />
                <span aria-hidden>€</span>
              </label>
              <button type="submit" className="btn btn-secondary btn-sm">OK</button>
            </form>
            {priceError && <p className="field-error" role="alert">{priceError}</p>}
            <div className="chips">
              {RANGES.map((r) => {
                const pressed = minPrice === r.min && maxPrice === r.max
                return (
                  <button key={r.label} type="button" className="chip chip-sm" aria-pressed={pressed}
                    onClick={() => update(pressed ? { minPrice: null, maxPrice: null } : { minPrice: r.min ? String(r.min) : null, maxPrice: r.max ? String(r.max) : null })}>
                    {r.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="filter-group">
            <legend>Options</legend>
            <ul className="filter-options">
              <li>
                <label>
                  <input type="checkbox" checked={params.has('buyable')} onChange={(e) => update({ buyable: e.target.checked ? '1' : null })} />
                  Achat en ligne possible
                </label>
              </li>
              <li>
                <label>
                  <input type="checkbox" checked={params.has('photos')} onChange={(e) => update({ photos: e.target.checked ? '1' : null })} />
                  Avec photos
                </label>
              </li>
            </ul>
          </fieldset>
        </aside>

        <section className="results" aria-label="Résultats">
          <div className="results-bar">
            <label className="sort">
              Trier par
              <select value={sort} onChange={(e) => update({ sort: e.target.value === 'recent' ? null : e.target.value })}>
                {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          {active.length > 0 && (
            <div className="chips active-filters" aria-label="Filtres actifs">
              {active.map((f) => (
                <button key={f.label} type="button" className="chip chip-sm is-active" onClick={() => update(f.remove)} aria-label={`Retirer le filtre ${f.label}`}>
                  {f.label}
                  <X size={14} aria-hidden />
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParams(new URLSearchParams())}>
                Tout effacer
              </button>
            </div>
          )}

          {error ? (
            <Alert type="error">{error}</Alert>
          ) : !result ? (
            <p role="status" className="muted">Recherche en cours…</p>
          ) : result.items.length === 0 ? (
            <EmptyState title="Aucune annonce ne correspond" action={<Link to="/listings/new" className="btn btn-primary">Déposer une annonce</Link>}>
              Essayez avec moins de filtres ou un autre mot-clé.
            </EmptyState>
          ) : (
            <>
              <div className="listing-grid">
                {result.items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} to={`/annonces/${listing.id}`} {...favoriteProps(listing)} />
                ))}
              </div>
              {pages > 1 && (
                <nav className="pagination" aria-label="Pages de résultats">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => update({ page: page > 2 ? String(page - 1) : null })}>Précédent</button>
                  <span>Page {page} sur {pages}</span>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Suivant</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
