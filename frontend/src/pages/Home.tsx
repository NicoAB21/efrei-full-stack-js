import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Field } from '../components/Field'
import { ListingCard } from '../components/ListingCard'
import { CATEGORIES, type Listing } from '../constants'
import { apiFetch } from '../api'
import { errorMessage } from '../listings'
import { parsePrice, toPriceInput } from '../price'

export function Home() {
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  return <Catalogue key={query} query={query} search={setParams} />
}

function Catalogue({ query, search }: { query: string; search: (params: URLSearchParams) => void }) {
  const params = new URLSearchParams(query)
  const priceValue = (key: string) => {
    const value = params.get(key)
    return value && Number.isSafeInteger(Number(value)) ? toPriceInput(Number(value)) : ''
  }
  const [items, setItems] = useState<Listing[] | null>(null)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState('')

  useEffect(() => {
    let active = true
    apiFetch<{ items: Listing[] }>(`/public/listings${query ? `?${query}` : ''}`)
      .then((result) => { if (active) setItems(result.items) })
      .catch((cause: unknown) => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [query])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    for (const key of ['q', 'city', 'category']) {
      const value = String(data.get(key) ?? '').trim()
      if (value) next.set(key, value)
    }
    for (const key of ['minPrice', 'maxPrice']) {
      const value = String(data.get(key) ?? '').trim()
      if (!value) continue
      const cents = parsePrice(value)
      if (cents === null) {
        setValidation('Saisissez un prix supérieur à 0 €, avec au maximum deux décimales.')
        return
      }
      next.set(key, String(cents))
    }
    if (next.has('minPrice') && next.has('maxPrice') && Number(next.get('minPrice')) > Number(next.get('maxPrice'))) {
      setValidation('Le prix maximum doit être supérieur ou égal au prix minimum.')
      return
    }
    setValidation('')
    search(next)
  }

  return (
    <div className="stack" style={{ gap: 'var(--s-5)' }}>
      <div className="stack">
        <h1>Trouvez votre prochaine bonne affaire</h1>
        <p className="muted">Découvrez les objets disponibles près de chez vous.</p>
      </div>
      <form className="panel" onSubmit={submit} aria-label="Rechercher des annonces">
        <div className="public-filters">
          <Field label="Mot-clé" name="q" maxLength={100} defaultValue={params.get('q') ?? ''} />
          <Field label="Ville" name="city" maxLength={80} defaultValue={params.get('city') ?? ''} />
          <Field as="select" label="Catégorie" name="category" defaultValue={params.get('category') ?? ''}>
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Field>
          <Field label="Prix minimum (€)" name="minPrice" inputMode="decimal" placeholder="Ex. 10,50" defaultValue={priceValue('minPrice')} />
          <Field label="Prix maximum (€)" name="maxPrice" inputMode="decimal" placeholder="Ex. 100" defaultValue={priceValue('maxPrice')} />
        </div>
        {validation && <Alert type="error">{validation}</Alert>}
        <div className="row">
          <Button type="submit">Rechercher</Button>
          <Button
            variant="secondary"
            onClick={(event) => {
              event.currentTarget.form?.reset()
              setValidation('')
              search(new URLSearchParams())
            }}
          >
            Effacer les filtres
          </Button>
        </div>
      </form>
      {error ? <Alert type="error">{error}</Alert> : items === null ? (
        <p role="status" className="muted">Chargement des annonces…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucune annonce" action={<Link to="/listings/new" className="btn btn-primary">Publier une annonce</Link>}>
          Essayez d’autres critères ou publiez votre première annonce.
        </EmptyState>
      ) : (
        <>
          <p className="muted" role="status">
            {items.length} annonce{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
            {items.length === 50 && ' · Les 50 plus récentes. Affinez les filtres pour préciser votre recherche.'}
          </p>
          <div className="listing-grid">
            {items.map((listing) => <ListingCard key={listing.id} listing={listing} to={`/annonces/${listing.id}`} />)}
          </div>
        </>
      )}
    </div>
  )
}
