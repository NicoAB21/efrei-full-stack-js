import { useState } from 'react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { CATEGORIES } from '../constants'

/** Vitrine du design system : à consulter avant de créer un composant. */
export function DesignPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="stack">
      <h1>Design system</h1>
      <p className="muted">
        Composants dans <code>src/components/</code>, variables dans <code>src/index.css</code>.
      </p>

      <section className="stack">
        <h2>Button</h2>
        <div className="row">
          <Button>Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="danger">Supprimer</Button>
          <Button disabled>Désactivé</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true)
              setTimeout(() => setLoading(false), 1500)
            }}
          >
            Tester le chargement
          </Button>
        </div>
      </section>

      <section className="stack">
        <h2>Field</h2>
        <Field label="Titre" placeholder="Vélo de ville" hint="120 caractères maximum" />
        <Field label="Prix (€)" inputMode="decimal" defaultValue="0" error="Le prix doit être supérieur à 0" />
        <Field as="textarea" label="Description" />
        <Field as="select" label="Catégorie" defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {Object.entries(CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Field>
      </section>

      <section className="stack">
        <h2>Alert</h2>
        <Alert type="success">Annonce publiée.</Alert>
        <Alert type="error">Email ou mot de passe incorrect.</Alert>
      </section>

      <section className="stack">
        <h2>Card</h2>
        <div className="grid">
          <Card
            to="/design"
            listing={{ title: 'Vélo de ville', priceCents: 8500, category: 'loisirs', city: 'Lyon', status: 'available' }}
          />
          <Card
            listing={{ title: 'iPhone 12', priceCents: 32000, category: 'multimedia', city: 'Paris', status: 'sold' }}
          />
        </div>
      </section>
    </div>
  )
}
