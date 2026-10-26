import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { CategoryIcon } from '../components/CategoryIcon'
import { EmptyState } from '../components/EmptyState'
import { Field } from '../components/Field'
import { ListingCard } from '../components/ListingCard'
import { Logo } from '../components/Logo'
import { PriceTag } from '../components/PriceTag'
import { StatusBadge } from '../components/StatusBadge'
import { CATEGORIES, type Category, type Listing } from '../constants'

// Référence vivante du design system « Étiquette » (règles : src/design-system/GUIDE.md).

const SWATCHES = [
  ['--tag', 'Orange étiquette', 'action principale, prix'],
  ['--tag-dk', 'Orange foncé', 'survol, texte orange'],
  ['--night', 'Bleu nuit', 'texte, point de l’étiquette'],
  ['--paper', 'Blanc cassé', 'fond de page'],
  ['--soft', 'Gris clair', 'tuiles, images vides'],
  ['--text-2', 'Gris texte', 'texte secondaire'],
  ['--ok', 'Vert', 'disponible'],
  ['--sold', 'Gris ardoise', 'vendue'],
  ['--danger', 'Rouge', 'erreur, suppression'],
]

const now = new Date().toISOString()
const SAMPLES: (Pick<Listing, 'title' | 'priceCents' | 'category' | 'city' | 'status' | 'createdAt'>)[] = [
  { title: 'Vélo de ville Gitane', priceCents: 8500, category: 'loisirs', city: 'Lyon', status: 'available', createdAt: now },
  { title: 'iPhone 12 128 Go', priceCents: 32000, category: 'multimedia', city: 'Paris', status: 'available', createdAt: now },
  { title: 'Canapé 3 places gris', priceCents: 15000, category: 'maison', city: 'Nantes', status: 'sold', createdAt: now },
  { title: 'Peugeot 208 Allure', priceCents: 890000, category: 'vehicules', city: 'Bordeaux', status: 'available', createdAt: now },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="stack" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  )
}

export function DesignPage() {
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<Category | null>(null)

  return (
    <div className="stack" style={{ gap: 'var(--s-7)' }}>
      <header className="stack" style={{ gap: 'var(--s-2)' }}>
        <h1>Design system « Étiquette »</h1>
        <p className="muted">
          Tokens : <code>src/design-system/tokens.css</code> · classes : <code>components.css</code> · règles :{' '}
          <code>GUIDE.md</code> · composants React : <code>src/components/</code>.
        </p>
      </header>

      <Section title="Marque">
        <div className="row" style={{ gap: 'var(--s-4)' }}>
          {['#ffffff', 'var(--paper)', 'var(--night)'].map((bg) => (
            <div key={bg} style={{ background: bg, padding: 'var(--s-4) var(--s-5)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
              <Logo />
            </div>
          ))}
          <img src="/favicon.svg" width={48} height={48} alt="Favicon « oz »" />
          <img src="/favicon.svg" width={32} height={32} alt="" />
          <img src="/favicon.svg" width={16} height={16} alt="" />
        </div>
        <p className="muted small">Slogan : « Vos objets ont encore de la valeur. » · Police : Inter (hébergée, OFL).</p>
      </Section>

      <Section title="Couleurs">
        <div className="category-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {SWATCHES.map(([token, name, role]) => (
            <div key={token} className="stack" style={{ gap: 4 }}>
              <div style={{ height: 56, borderRadius: 'var(--r-sm)', background: `var(${token})`, border: '1px solid var(--line)' }} />
              <strong className="small">{name}</strong>
              <code className="small muted">{token}</code>
              <span className="small muted">{role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typographie">
        <p style={{ fontSize: 'var(--fs-display)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05 }}>Display 900</p>
        <h1>Titre h1 900</h1>
        <h2>Titre h2 800</h2>
        <h3>Titre h3 700</h3>
        <p>Corps 15 px, Inter 400. Phrases courtes, des faits plutôt que des adjectifs.</p>
        <p className="muted small">Texte secondaire 13 px.</p>
      </Section>

      <Section title="Hero">
        <div className="hero">
          <h1>Vos objets ont encore de la valeur.</h1>
          <p>Vendez ce qui dort chez vous, trouvez la bonne affaire près de chez vous. Une annonce en moins de 2 minutes.</p>
          <div className="row">
            <Link to="/listings/new" className="btn btn-white">Publier une annonce</Link>
            <Link to="/" className="btn btn-outline-white">Parcourir les annonces</Link>
          </div>
        </div>
      </Section>

      <Section title="Boutons">
        <div className="row">
          <Button>Publier l'annonce</Button>
          <Button variant="night">Se connecter</Button>
          <Button variant="secondary">Modifier</Button>
          <Button variant="ghost">Annuler</Button>
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
          <Button size="sm">Petit</Button>
        </div>
      </Section>

      <Section title="Prix et statuts">
        <div className="row">
          <PriceTag cents={1200} />
          <PriceTag cents={8500} size="lg" />
          <PriceTag cents={15000} sold />
          <StatusBadge status="available" />
          <StatusBadge status="sold" />
        </div>
      </Section>

      <Section title="Catégories">
        <div className="category-tiles">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <button key={c} type="button" className="category-tile" aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>
              <CategoryIcon category={c} size={26} strokeWidth={1.75} />
              {CATEGORIES[c]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Cartes d'annonce">
        <div className="listing-grid">
          {SAMPLES.map((l) => (
            <ListingCard key={l.title} listing={l} to="/design" />
          ))}
        </div>
      </Section>

      <Section title="Détail">
        <article className="panel" style={{ maxWidth: 560 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <StatusBadge status="available" />
            <span className="muted small">Publiée aujourd'hui</span>
          </div>
          <h2>Vélo de ville Gitane</h2>
          <div style={{ ['--hole-bg' as string]: 'var(--surface)' }}>
            <PriceTag cents={8500} size="lg" />
          </div>
          <div className="facts">
            <div>Catégorie<b>Loisirs</b></div>
            <div>Ville<b>Lyon</b></div>
            <div>Publiée le<b>26 oct.</b></div>
          </div>
          <p className="muted">Vélo 7 vitesses, révisé en septembre. Pneus neufs, quelques rayures sur le cadre.</p>
        </article>
      </Section>

      <Section title="Formulaire">
        <form className="panel" style={{ maxWidth: 560 }} onSubmit={(e) => e.preventDefault()} noValidate>
          <Field label="Titre" placeholder="Vélo de ville" hint="120 caractères maximum" />
          <Field label="Prix (€)" inputMode="decimal" defaultValue="0" error="Le prix doit être supérieur à 0 €" />
          <Field as="select" label="Catégorie" defaultValue="">
            <option value="" disabled>Choisir…</option>
            {Object.entries(CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Field>
          <Field as="textarea" label="Description" placeholder="État, dimensions, conditions de remise…" />
          <div className="row">
            <Button type="submit">Publier l'annonce</Button>
            <Button variant="ghost">Annuler</Button>
          </div>
        </form>
      </Section>

      <Section title="Messages et état vide">
        <Alert type="success">Annonce publiée. Elle est visible dans « Mes annonces ».</Alert>
        <Alert type="error">Email ou mot de passe incorrect.</Alert>
        <EmptyState title="Vous n'avez pas encore d'annonce" action={<Link to="/listings/new" className="btn btn-primary">Publier une annonce</Link>}>
          Un objet qui dort dans un placard ? Donnez-lui une seconde vie.
        </EmptyState>
      </Section>
    </div>
  )
}
