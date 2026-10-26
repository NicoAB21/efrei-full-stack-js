# Design system Occaz — « Étiquette »

Le style du front Occaz, en CSS natif, sans librairie d'interface.

- `tokens.css` : police, couleurs, typo, formes, espaces, mouvement.
- `components.css` : base et classes (`.btn`, `.logo`, `.price-tag`, `.stamp`, `.badge`, `.listing-card`, `.category-tile`, `.hero`, `.panel`, `.field`, `.alert`, `.empty-state`, `.site-header`…).
- `fonts/` : Inter variable en woff2, avec sa licence OFL.
- `brand/` : `logo.svg` (texte vectorisé), `favicon.svg` (« oz »), et `gen-logo.py` pour les régénérer.
- `GUIDE.md` : les règles de marque (quand mettre de l'orange, l'étiquette, le tampon ; logo ; ton).
- Référence vivante : la page **`/design`** du front (`src/pages/DesignPage.tsx`).

## Utiliser

Les deux feuilles sont chargées une fois dans `src/main.tsx`. Dans le code :

- passer par les **composants React** de `src/components/` quand ils existent (`Button`, `Field`, `Alert`, `PriceTag`, `StatusBadge`, `ListingCard`, `CategoryIcon`, `EmptyState`, `Logo`) ;
- sinon poser les **classes** de `components.css` ;
- n'écrire une couleur, un rayon ou un espace **qu'avec un token** (`var(--tag)`, `var(--r-md)`, `var(--s-4)`), jamais en dur.

Icônes : [Lucide](https://lucide.dev) via `lucide-react` (licence ISC). `import { Bike } from 'lucide-react'`.
