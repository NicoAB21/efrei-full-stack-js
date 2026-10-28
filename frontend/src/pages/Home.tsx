import { Clock, HandCoins, MapPin, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiFetch } from '../api'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { CategoryIcon } from '../components/CategoryIcon'
import { CommuneField, type CommuneChoice } from '../components/CommuneField'
import { EmptyState } from '../components/EmptyState'
import { Field } from '../components/Field'
import { ListingCard } from '../components/ListingCard'
import { CATEGORIES, type Category, type Listing } from '../constants'
import { useFavoriteProps } from '../favorites'
import { errorMessage } from '../listings'
import { parsePrice, toPriceInput } from '../price'

// Page « Annonces » (accueil, US4) : vitrine publique branchée sur GET /api/public/listings.
// Les filtres vivent dans l'URL (?q=&city=&category=&minPrice=&maxPrice=), prix en centimes.

const SMALL_PRICE = 4000 // « Petits prix » : 40 € maximum
const MAX_RESULTS = 50 // plafond renvoyé par l'API
const FILTER_KEYS = ['q', 'city', 'cityCode', 'category', 'minPrice', 'maxPrice']

const fetchPublic = async (query: string) =>
  (await apiFetch<{ items: Listing[] }>(`/public/listings${query ? `?${query}` : ''}`)).items

export function Home() {
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  // key : remonte la page à chaque recherche pour réinitialiser les champs sur l'URL
  return <Catalogue key={query} query={query} search={setParams} />
}

function Catalogue({ query, search }: { query: string; search: (params: URLSearchParams) => void }) {
  const params = new URLSearchParams(query)
  const filtered = FILTER_KEYS.some((key) => params.has(key))
  const category = params.get('category') as Category | null
  // Commune choisie dans les suggestions (cityCode) ; le nom reste dans `city` pour l'affichage
  const [commune, setCommune] = useState<CommuneChoice | null>(() => {
    const code = params.get('cityCode')
    const name = params.get('city') ?? ''
    return code ? { cityCode: code, postalCode: '', name, label: name } : null
  })
  const favoriteProps = useFavoriteProps()

  const [items, setItems] = useState<Listing[] | null>(null)
  const [error, setError] = useState('')
  const [smallPrices, setSmallPrices] = useState<Listing[]>([])
  const [validation, setValidation] = useState('')

  useEffect(() => {
    let active = true
    fetchPublic(query)
      .then((result) => { if (active) setItems(result) })
      .catch((cause: unknown) => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [query])

  // Sélection « Petits prix », seulement sur l'accueil sans filtre
  useEffect(() => {
    if (filtered) return
    let active = true
    fetchPublic(`maxPrice=${SMALL_PRICE}`)
      .then((result) => { if (active) setSmallPrices(result.slice(0, 10)) })
      .catch(() => {}) // section facultative : on la masque en cas d'erreur
    return () => { active = false }
  }, [filtered])

  /** Applique des changements de filtres (null = retirer) en gardant les autres. */
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(query)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    search(next)
    document.getElementById('annonces')?.scrollIntoView({ behavior: 'smooth' })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const q = String(data.get('q') ?? '').trim() || null
    // Suggestion choisie → toute la commune (tous codes postaux) ; sinon le texte tapé
    if (commune) update({ q, city: commune.name, cityCode: commune.cityCode })
    else update({ q, city: String(data.get('city') ?? '').trim() || null, cityCode: null })
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
      if (cents === null) {
        setValidation('Saisissez un prix supérieur à 0 €, avec au maximum deux décimales.')
        return
      }
      prices[key] = String(cents)
    }
    if (prices.minPrice && prices.maxPrice && Number(prices.minPrice) > Number(prices.maxPrice)) {
      setValidation('Le prix maximum doit être supérieur ou égal au prix minimum.')
      return
    }
    setValidation('')
    update(prices)
  }

  const priceValue = (key: string) => {
    const value = params.get(key)
    return value && Number.isSafeInteger(Number(value)) ? toPriceInput(Number(value)) : ''
  }

  // Villes les plus présentes parmi les annonces récentes
  const cities = filtered || !items ? [] : topCities(items)

  return (
    <div className="stack" style={{ gap: 'var(--s-7)' }}>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Vos objets ont encore de la valeur.</h1>
        <p>Vendez ce qui dort chez vous, trouvez la bonne affaire près de chez vous. Une annonce en moins de 2 minutes.</p>
        <form className="hero-search" role="search" onSubmit={submitSearch}>
          <label>
            <Search size={18} aria-hidden />
            <span className="sr-only">Que cherchez-vous ?</span>
            <input name="q" placeholder="Que cherchez-vous ? Ex. vélo" maxLength={100} defaultValue={params.get('q') ?? ''} />
          </label>
          <CommuneField
            label="Ville"
            name="city"
            placeholder="Ville ou code postal"
            value={commune}
            onChange={setCommune}
            initialText={params.get('city') ?? ''}
          />
          <button type="submit" className="btn btn-primary">Rechercher</button>
        </form>
      </section>

      <section className="stack" aria-labelledby="cat-title">
        <h2 id="cat-title">Explorer par catégorie</h2>
        <div className="category-tiles">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <button
              key={c}
              type="button"
              className="category-tile"
              aria-pressed={category === c}
              onClick={() => update({ category: category === c ? null : c })}
            >
              <CategoryIcon category={c} size={26} strokeWidth={1.75} />
              {CATEGORIES[c]}
            </button>
          ))}
        </div>
      </section>

      <section id="annonces" className="stack" aria-labelledby="annonces-title" style={{ scrollMarginTop: 96 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div>
            <h2 id="annonces-title">{filtered ? 'Résultats' : 'Annonces récentes'}</h2>
            {items && (
              <p className="muted small" role="status">
                {items.length} annonce{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
                {category && ` · ${CATEGORIES[category]}`}
                {params.get('city') && ` · ${params.get('city')}`}
                {params.get('q') && ` · « ${params.get('q')} »`}
                {items.length === MAX_RESULTS && ' · les 50 plus récentes, affinez la recherche'}
              </p>
            )}
          </div>
          {filtered && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => search(new URLSearchParams())}>
              Effacer les filtres
            </button>
          )}
        </div>

        <details className="panel" open={params.has('minPrice') || params.has('maxPrice') || Boolean(validation)}>
          <summary>Filtrer par prix</summary>
          <form className="stack" onSubmit={submitPrices} aria-label="Filtrer par prix" noValidate>
            <div className="price-filters">
              <Field label="Prix minimum (€)" name="minPrice" inputMode="decimal" placeholder="Ex. 10,50" defaultValue={priceValue('minPrice')} />
              <Field label="Prix maximum (€)" name="maxPrice" inputMode="decimal" placeholder="Ex. 100" defaultValue={priceValue('maxPrice')} />
            </div>
            {validation && <Alert type="error">{validation}</Alert>}
            <div className="row">
              <Button type="submit" size="sm">Appliquer</Button>
            </div>
          </form>
        </details>

        {error ? (
          <Alert type="error">{error}</Alert>
        ) : items === null ? (
          <p role="status" className="muted">Chargement des annonces…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title={filtered ? 'Aucune annonce ne correspond' : 'Aucune annonce pour le moment'}
            action={<Link to="/listings/new" className="btn btn-primary">Publier une annonce</Link>}
          >
            {filtered ? 'Essayez d’autres critères, ou publiez la vôtre.' : 'Soyez le premier à vendre un objet.'}
          </EmptyState>
        ) : (
          <div className="listing-grid">
            {items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} to={`/annonces/${listing.id}`} {...favoriteProps(listing)} />
            ))}
          </div>
        )}
      </section>

      {!filtered && smallPrices.length > 0 && (
        <section className="stack" aria-labelledby="small-title">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <h2 id="small-title">Petits prix</h2>
              <p className="muted small">Des bonnes affaires à 40 € maximum.</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ maxPrice: String(SMALL_PRICE) })}>
              Tout voir
            </button>
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
          <h2 id="cities-title">Près de chez vous</h2>
          <div className="chips">
            {cities.map(({ name, cityCode, count }) => (
              <button key={cityCode ?? name} type="button" className="chip" onClick={() => update({ city: name, cityCode })}>
                <MapPin size={16} aria-hidden />
                {name}
                <span className="count">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <ul className="trust" aria-label="Pourquoi Occaz">
        <li>
          <span className="icon"><HandCoins size={22} aria-hidden /></span>
          <span><strong>100 % gratuit</strong><span className="muted small">Publier une annonce ne coûte rien.</span></span>
        </li>
        <li>
          <span className="icon"><Clock size={22} aria-hidden /></span>
          <span><strong>En ligne en 2 minutes</strong><span className="muted small">Un titre, un prix, une ville : c'est publié.</span></span>
        </li>
        <li>
          <span className="icon"><ShieldCheck size={22} aria-hidden /></span>
          <span><strong>Vos annonces restent les vôtres</strong><span className="muted small">Personne d'autre ne peut les modifier.</span></span>
        </li>
      </ul>

      <section className="steps" aria-labelledby="steps-title">
        <h2 id="steps-title">Vendre en 3 étapes</h2>
        <ol>
          <li><strong>Créez votre compte</strong>Un email et un mot de passe, c'est tout.</li>
          <li><strong>Publiez l'annonce</strong>Titre, prix, ville. Moins de 2 minutes.</li>
          <li><strong>Marquez-la vendue</strong>Une fois l'affaire conclue, elle quitte la vitrine.</li>
        </ol>
      </section>

      <section className="cta-band" aria-labelledby="cta-title">
        <div className="stack" style={{ gap: 'var(--s-2)' }}>
          <h2 id="cta-title">Un objet qui dort dans un placard ?</h2>
          <p className="muted">Donnez-lui une seconde vie, et récupérez un peu d'argent au passage.</p>
        </div>
        <Link to="/listings/new" className="btn btn-primary">Publier une annonce</Link>
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
