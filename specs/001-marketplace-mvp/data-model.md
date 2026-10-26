# Data Model: Occaz

Collections MongoDB gérées par Mongoose. Les règles de validation métier sont appliquées par
Zod à l'entrée (cf. [research.md §2](./research.md)) ; Mongoose ne garde que les contraintes
structurelles (types, `required`, `enum`, index).

Sérialisation commune (`toJSON`) : `_id` → `id` (string), suppression de `__v` et de
`passwordHash`. Les dates sortent en ISO 8601.

## User (`users`)

| Champ | Type | Règles |
|---|---|---|
| `_id` | ObjectId | généré |
| `email` | string | requis, `trim` + `lowercase`, format email, **index unique** |
| `passwordHash` | string | requis, bcrypt coût 10, jamais renvoyé |
| `createdAt`, `updatedAt` | Date | `timestamps: true` |

Entrées (Zod) : `email` email valide ; `password` string ≥ 8 caractères. Corps strict.

Représentation publique : `{ "id", "email" }`.

Doublon : l'email est normalisé en minuscules avant insertion ; l'erreur Mongo `11000`
est traduite en `409 EMAIL_ALREADY_USED`.

## Listing (`listings`)

| Champ | Type | Règles |
|---|---|---|
| `_id` | ObjectId | généré, jamais fourni par le client |
| `ownerId` | ObjectId → User | requis, posé depuis le JWT, jamais fourni ni modifiable |
| `title` | string | après `trim` : 1 à 120 caractères |
| `description` | string | 0 à 2000 caractères, défaut `""` |
| `priceCents` | number | entier, 1 ≤ x ≤ `Number.MAX_SAFE_INTEGER` |
| `category` | enum | `vehicules` \| `immobilier` \| `multimedia` \| `maison` \| `mode` \| `loisirs` \| `autre` |
| `city` | string | après `trim` : 1 à 80 caractères |
| `status` | enum | `available` \| `sold`, défaut `available` |
| `createdAt`, `updatedAt` | Date | `timestamps: true` |

Index : `{ ownerId: 1, createdAt: -1 }` (Mes annonces) ; `{ status: 1, createdAt: -1 }` (P2).

Entrées (Zod) :

- **create** : `title`, `priceCents`, `category`, `city` requis ; `description`, `status`
  facultatifs. `.strict()` → `id`, `ownerId`, `_id` ou tout autre champ = 400.
- **update** : `create.partial().strict()` + au moins une clé.

Transitions de statut : `available ⇄ sold`, librement par le propriétaire via `PATCH`.
Une annonce `sold` disparaît de la vitrine publique mais reste dans « Mes annonces ».

Représentation (privée et publique) :

```json
{ "id", "ownerId", "title", "description", "priceCents", "category", "city", "status",
  "createdAt", "updatedAt" }
```

`ownerId` est un identifiant opaque, pas une donnée personnelle (FR-015) ; il permet au front
de masquer « Contacter » sur ses propres annonces (P3).

Règle d'accès (gestion privée) : toute lecture/écriture filtre sur `{ _id: id, ownerId: userId }`.
Aucun résultat → `404 NOT_FOUND`, que l'annonce n'existe pas ou appartienne à un autre compte.

## Message (`messages`) — P3 uniquement

| Champ | Type | Règles |
|---|---|---|
| `_id` | ObjectId | généré |
| `listingId` | ObjectId → Listing | requis |
| `senderId` | ObjectId → User | depuis le JWT |
| `recipientId` | ObjectId → User | = `ownerId` de l'annonce, calculé serveur |
| `body` | string | après `trim` : 1 à 1000 caractères |
| `createdAt` | Date | `timestamps: true` |

Règles : annonce `available` requise ; `senderId ≠ recipientId` (sinon 400) ; lecture limitée
à `recipientId = userId` ou `senderId = userId`.
