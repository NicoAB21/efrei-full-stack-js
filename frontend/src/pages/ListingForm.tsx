import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert } from '../components/Alert'
import { BackLink } from '../components/BackLink'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { CATEGORIES, STATUSES, type Category, type Listing, type Status } from '../constants'
import { createListing, errorMessage, fetchListing, loadErrorMessage, updateListing, type ListingInput } from '../listings'
import { parsePrice, toPriceInput } from '../price'

type FieldName = 'title' | 'description' | 'price' | 'category' | 'city' | 'status'
type Values = Record<FieldName, string>
type Errors = Partial<Record<FieldName, string>>

const EMPTY: Values = { title: '', description: '', price: '', category: '', city: '', status: 'available' }

function validate(values: Values): Errors {
  const errors: Errors = {}
  const title = values.title.trim()
  const city = values.city.trim()

  if (!title) errors.title = 'Indiquez un titre.'
  else if (title.length > 120) errors.title = 'Raccourcissez le titre à 120 caractères maximum.'
  if (values.description.length > 2000) errors.description = 'Raccourcissez la description à 2 000 caractères maximum.'
  if (parsePrice(values.price) === null) errors.price = 'Indiquez un prix supérieur à 0 €, par exemple 85 ou 85,50.'
  if (!Object.hasOwn(CATEGORIES, values.category)) errors.category = 'Choisissez une catégorie.'
  if (!city) errors.city = 'Indiquez une ville.'
  else if (city.length > 80) errors.city = 'Raccourcissez la ville à 80 caractères maximum.'

  return errors
}

const toInput = (values: Values): ListingInput => ({
  title: values.title.trim(),
  description: values.description,
  priceCents: parsePrice(values.price) as number,
  category: values.category as Category,
  city: values.city.trim(),
  status: values.status as Status,
})

const fromListing = (listing: Listing): Values => ({
  title: listing.title,
  description: listing.description,
  price: toPriceInput(listing.priceCents),
  category: listing.category,
  city: listing.city,
  status: listing.status,
})

type FormProps = {
  initial: Values
  editing: boolean
  cancelTo: string
  onSubmit: (input: ListingInput) => Promise<void>
}

function ListingForm({ initial, editing, cancelTo, onSubmit }: FormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const bind = (name: FieldName) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues({ ...values, [name]: e.target.value }),
  })

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await onSubmit(toInput(values))
    } catch (err) {
      setServerError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      {serverError && <Alert type="error">{serverError}</Alert>}
      <Field label="Titre" placeholder="Vélo de ville" hint="120 caractères maximum" maxLength={120} required {...bind('title')} />
      <Field label="Prix (€)" inputMode="decimal" placeholder="85,00" hint="En euros, par exemple 85 ou 85,50" required {...bind('price')} />
      <Field as="select" label="Catégorie" required {...bind('category')}>
        <option value="" disabled>
          Choisir…
        </option>
        {Object.entries(CATEGORIES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Field>
      <Field label="Ville" placeholder="Lyon" autoComplete="address-level2" maxLength={80} required {...bind('city')} />
      <Field
        as="textarea"
        label="Description"
        placeholder="État, dimensions, conditions de remise…"
        hint="Facultatif, 2 000 caractères maximum"
        maxLength={2000}
        {...bind('description')}
      />
      {editing && (
        <Field as="select" label="Statut" {...bind('status')}>
          {Object.entries(STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Field>
      )}
      <div className="row">
        <Button type="submit" loading={saving}>
          {editing ? 'Enregistrer les modifications' : "Publier l'annonce"}
        </Button>
        <Link to={cancelTo} className="btn btn-ghost">
          Annuler
        </Link>
      </div>
    </form>
  )
}

function FormLayout({ title, backTo, backLabel, children }: { title: string; backTo: string; backLabel: string; children: ReactNode }) {
  return (
    <div className="stack" style={{ maxWidth: 560, marginInline: 'auto' }}>
      <BackLink to={backTo}>{backLabel}</BackLink>
      <h1>{title}</h1>
      {children}
    </div>
  )
}

export function NewListingPage() {
  const navigate = useNavigate()

  async function publish(input: ListingInput) {
    const created = await createListing(input)
    navigate(`/listings/${created.id}`, { state: { message: 'Annonce publiée. Elle apparaît dans « Mes annonces ».' } })
  }

  return (
    <FormLayout title="Publier une annonce" backTo="/listings" backLabel="Mes annonces">
      <ListingForm initial={EMPTY} editing={false} cancelTo="/listings" onSubmit={publish} />
    </FormLayout>
  )
}

export function EditListingPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchListing(id)
      .then((found) => {
        if (active) setListing(found)
      })
      .catch((e: unknown) => {
        if (active) setError(loadErrorMessage(e))
      })
    return () => {
      active = false
    }
  }, [id])

  async function save(input: ListingInput) {
    if (!listing) return
    const changes = Object.fromEntries(
      Object.entries(input).filter(([key, value]) => listing[key as keyof ListingInput] !== value),
    ) as Partial<ListingInput>

    if (Object.keys(changes).length > 0) await updateListing(listing.id, changes)
    navigate(`/listings/${listing.id}`, {
      state: { message: Object.keys(changes).length > 0 ? 'Modifications enregistrées.' : 'Aucune modification à enregistrer.' },
    })
  }

  return (
    <FormLayout title="Modifier l'annonce" backTo={listing ? `/listings/${listing.id}` : '/listings'} backLabel="Retour à l'annonce">
      {error ? (
        <Alert type="error">{error}</Alert>
      ) : listing === null ? (
        <p className="muted" role="status">
          Chargement de l'annonce…
        </p>
      ) : (
        <ListingForm key={listing.id} initial={fromListing(listing)} editing cancelTo={`/listings/${listing.id}`} onSubmit={save} />
      )}
    </FormLayout>
  )
}
