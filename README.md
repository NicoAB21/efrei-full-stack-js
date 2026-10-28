# Occaz

**Vos objets ont encore de la valeur.** Occaz est un site de petites annonces entre particuliers, sur le principe de Leboncoin : on publie un objet en moins de 2 minutes, on le retrouve dans « Mes annonces », et tout visiteur peut parcourir et filtrer les annonces disponibles.

Projet du module EFREI « Full Stack JS » (M1, octobre 2026), réalisé par Nicolas, Kelyan et Ismael.

## Fonctionnalités

| | Fonctionnalité | Accès |
|---|---|---|
| US1 | Inscription, connexion, déconnexion (email + mot de passe ≥ 8 caractères), session JWT | public |
| US2 | **Mes annonces** : publier, lister, consulter, modifier (prix, statut « vendue »…), supprimer avec confirmation | connecté |
| US3 | **Isolation** : un vendeur ne peut ni voir, ni modifier, ni supprimer les annonces d'un autre (404) | serveur |
| US4 | **Vitrine** : annonces disponibles de tous les vendeurs, recherche (mot-clé, ville), catégories, fourchette de prix, détail sans donnée privée | public |
| US5 | **Messagerie** : « Contacter le vendeur » depuis le détail d'une annonce, page « Messages reçus » regroupée par annonce | connecté |
| + | **Favoris** liés au compte : cœur sur les cartes et le détail, page « Favoris », reprise des favoris du navigateur à la connexion (spec 002) | connecté (navigateur pour un visiteur) |
| + | **Photos** : 0 à 5 par annonce (JPEG, PNG, WebP vérifiés, métadonnées GPS retirées), photo principale sur les cartes, galerie sur le détail (spec 003) | propriétaire / public |
| + | **Communes officielles** : la ville se choisit dans les suggestions (nom ou code postal), vérifiée par le serveur ; recherche par commune sans tenir compte des accents (spec 004) | propriétaire / public |
| + | **Paiement de démonstration** (Stripe, mode test) : « Acheter (démo) », vente validée par webhook signé, une seule vente par annonce (l'autre paiement est remboursé), « Mes achats » (spec 005) | connecté |
| + | Sélections « Petits prix » et « Près de chez vous » | public |

Pages : `/` (accueil), `/recherche` (résultats et filtres), `/annonces/:id` (détail public), `/favoris`, `/login`, `/register`, `/listings` (mes annonces), `/listings/new`, `/listings/:id`, `/listings/:id/edit`, `/achats` et `/achats/:id` (mes achats, récapitulatif), `/messages` (messages reçus), `/design` (design system).

## Architecture

```text
frontend/  React 19 + Vite + TypeScript ─┐  /api/* (proxy Vite, pas de CORS)
                                          ▼
backend/   Express 5 + TypeScript : routes → contrôleurs → services → modèles Mongoose ──► MongoDB 7
```

- **Back** ([`backend/src/`](backend/src/)) : `routes/` déclarent les URL et les middlewares, `controllers/` lisent la requête, `services/` portent la logique métier et les règles d'accès, `models/` décrivent les collections. `schemas/` contient la validation Zod, `errors.ts` le format d'erreur unique, `middleware/auth.ts` la vérification du JWT.
- **Front** ([`frontend/src/`](frontend/src/)) : `pages/` (une par écran), `components/` (briques du design system), `api.ts` (fetch + JWT + gestion du 401), `auth.tsx` (session), `price.ts` (centimes ↔ euros).
- **Données** : `users`, `listings` et `messages` ; MCD/MLD dans [`specs/001-marketplace-mvp/data-model.md`](specs/001-marketplace-mvp/data-model.md).
- **Contrat API** : Swagger sur http://localhost:3000/api/docs, généré depuis [`backend/openapi.yaml`](backend/openapi.yaml) (un test vérifie que chaque route documentée existe).

## Choix techniques

| Choix | Pourquoi |
|---|---|
| TypeScript partout | Types partagés par la conception, erreurs vues à la compilation (le livret autorise TS à la place de JS) |
| Express 5 | Les erreurs des handlers `async` remontent seules au middleware d'erreur, sans wrapper |
| Zod `.strict()` | Validation serveur lisible ; refuse d'office les champs inconnus, `id` et `ownerId` envoyés par le client |
| Prix en centimes | Entiers exacts : pas d'erreur d'arrondi (`19,99 €` = `1999`), conversion en euros seulement à l'affichage |
| Proxy Vite | Le front appelle `/api` en relatif : pas de CORS ni de dépendance `cors` |
| Design system maison | CSS natif + tokens, icônes Lucide, police Inter hébergée : aucune librairie d'interface ([`docs/design-system.md`](docs/design-system.md)) |
| spec-kit | Constitution → spec → plan → tâches → implémentation : chaque fonctionnalité a ses critères d'acceptation |

## Sécurité

- **Mots de passe** hachés avec bcrypt (coût 10), jamais renvoyés (`passwordHash` retiré de toutes les réponses).
- **JWT** HS256 signé avec `JWT_SECRET` (variable d'environnement, jamais versionnée), expiration 2 h ; `requireAuth` renvoie 401 si absent, falsifié ou expiré.
- **Isolation des comptes** : chaque requête sur une annonce filtre `{ _id, ownerId }` dans le service. L'annonce d'un autre compte répond **404, comme une annonce inexistante** (pas 403 : on ne révèle pas qu'elle existe). Prouvé par [`isolation.test.ts`](backend/tests/isolation.test.ts) et une contre-épreuve (retirer le filtre fait échouer les tests).
- **Validation côté serveur** de chaque entrée (corps, paramètres, id) ; la validation React ne sert qu'au confort.
- **Erreurs** au format unique `{"error":{"code","message"}}`, sans détail technique en cas d'erreur 500.

## Tests

`npm test` dans `backend/` lance Jest + Supertest sur une MongoDB en mémoire (base isolée, vidée avant chaque test) :

| Fichier | Ce qu'il prouve |
|---|---|
| `health.test.ts` | santé de l'API, 404 et JSON mal formé au bon format |
| `auth-middleware.test.ts` | 401 sans token, token falsifié, expiré, autre secret |
| `auth.test.ts` | inscription, email unique sans tenir compte de la casse, connexion, message neutre |
| `listings.test.ts` | CRUD complet, 400 sur chaque entrée invalide, 401 sur chaque route |
| `isolation.test.ts` | B ne peut rien faire sur l'annonce de A (404 identique à un id inexistant) |
| `public.test.ts` | vitrine : jamais d'annonce vendue, filtres, aucune donnée privée |
| `favorites.test.ts` | favoris : idempotence, 200 maximum, vendue gardée, supprimée retirée, import, isolation A/B |
| `messages.test.ts` | messagerie : destinataire calculé par le serveur, un tiers ne voit rien, sa propre annonce, annonce vendue ou inexistante, message vide ou trop long, 401 |
| `photos.test.ts` | photos : formats refusés (SVG, faux JPEG…), 5 Mo, 5 photos, GPS retiré, tout ou rien, ordre, suppression des fichiers, isolation A/B |
| `communes.test.ts` | communes : suggestions (« lyo », code postal, accents, homonymes), commune inventée ou code postal incohérent refusés |
| `migrate-communes.test.ts` | rattachement des anciennes annonces : sans ambiguïté rattachées, les autres laissées |
| `purchases.test.ts` | achat de démo : prix lu en base, double clic, refus (sa propre annonce, Immobilier, > 10 000 €), Stripe injoignable, clé `sk_live_` refusée, « Mes achats » isolé |
| `stripe-webhook.test.ts` | webhook : signature fausse ou absente sans effet, expiration, **deux paiements simultanés → 1 vente + 1 remboursement**, événement rejoué, vente en ligne définitive |
| `openapi.test.ts` | chaque route décrite dans Swagger existe vraiment |

Côté front, `npm test` (`node --test`, sans dépendance) vérifie la conversion des prix et `api.ts` : envoi du token, erreurs de connexion, retour à la connexion quand la session expire.

## Prérequis

- Node.js 24 (`nvm use` lit `.nvmrc`)
- Docker

## Lancer tout le projet (Docker)

```bash
docker compose up --build
```

| Service           | URL                              |
| ----------------- | -------------------------------- |
| Front             | http://localhost:5173            |
| Design system     | http://localhost:5173/design     |
| API               | http://localhost:3000/api/health |
| Doc API (Swagger) | http://localhost:3000/api/docs   |
| MongoDB           | mongodb://localhost:27017        |
| Relais Stripe     | service `stripe` (webhooks → API), actif seulement si `STRIPE_SECRET_KEY` est défini |

Le code est monté dans les conteneurs : le rechargement à chaud fonctionne. Après un
`npm install <paquet>`, relancer avec `docker compose up --build -V` (recrée les `node_modules`).

## Lancer en local (sans Docker pour Node)

```bash
docker compose up -d mongo

cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:3000

cd frontend            # autre terminal
npm install
npm run dev            # http://localhost:5173, proxy /api → :3000
```

## Commandes

| Dossier     | Commande        | Rôle                        |
| ----------- | --------------- | --------------------------- |
| `backend/`  | `npm run dev`   | API avec rechargement (tsx) |
| `backend/`  | `npm run lint`  | ESLint                      |
| `backend/`  | `npm run build` | compile vers `dist/`        |
| `backend/`  | `npm test`      | Jest + Supertest            |
| `backend/`  | `npm run data:communes` | retélécharge le référentiel des communes (`data/communes.json`, une fois par an) |
| `backend/`  | `npm run migrate:communes` | rattache les anciennes annonces à une commune (une fois, relançable) |
| `backend/`  | `npm run seed` | données de démo : 5 comptes `alice`, `bruno`, `chloe`, `david`, `emma` `@occaz.test` (mot de passe `motdepasse`) et 23 annonces avec 29 photos (Wikimedia Commons, licences libres, crédits dans `backend/seed/photos/CREDITS.md`) ; relançable, ne touche qu'aux comptes `@occaz.test`. Docker : `docker compose exec backend npm run seed` |
| `frontend/` | `npm run dev`   | serveur Vite                |
| `frontend/` | `npm run lint`  | ESLint                      |
| `frontend/` | `npm run build` | build de production         |
| `frontend/` | `npm test`      | tests unitaires (`node --test`) |

## Variables d'environnement (`backend/.env`)

| Variable      | Exemple                           | Rôle                                         |
| ------------- | --------------------------------- | -------------------------------------------- |
| `PORT`        | `3000`                            | port de l'API                                |
| `MONGODB_URI` | `mongodb://localhost:27017/occaz` | base MongoDB                                 |
| `JWT_SECRET`  | `change-me-dev-only`              | clé de signature des JWT (jamais versionnée) |
| `STRIPE_SECRET_KEY` | `sk_test_…` | facultatif : active le paiement de démonstration ; une clé `sk_live_` est refusée au démarrage |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | obligatoire avec la clé : affiché par `stripe listen` |
| `FRONT_URL` | `http://localhost:5173` | obligatoire avec la clé : retour après paiement |

### Paiement de démonstration (spec 005)

Aucun vrai argent ne circule : Stripe en **mode test** uniquement, le vendeur ne reçoit rien. Sans
`STRIPE_SECRET_KEY`, le site fonctionne normalement et le bouton « Acheter » n'apparaît pas.

1. Mettre dans `backend/.env` : `STRIPE_SECRET_KEY=sk_test_…`, `FRONT_URL=http://localhost:5173` et
   `STRIPE_WEBHOOK_SECRET=whsec_…`. Pour obtenir ce dernier (une seule fois, il ne change pas pour un compte) :
   ```bash
   docker compose run --rm --no-deps stripe 'STRIPE_API_KEY=$STRIPE_SECRET_KEY stripe listen --print-secret'
   ```
2. `docker compose up` : le service `stripe` relaie lui-même les confirmations de Stripe vers l'API
   (`docker compose logs -f stripe` pour les voir passer). Sans Docker : même commande `stripe listen` avec
   `--events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook`.
3. Cartes de test : `4242 4242 4242 4242` (acceptée), `4000 0000 0000 0002` (refusée), date future, CVC quelconque.

Les tests automatiques n'appellent jamais Stripe (passerelle simulée, webhooks signés localement).

## Travailler à plusieurs

Répartition et tâches : [`specs/001-marketplace-mvp/tasks.md`](specs/001-marketplace-mvp/tasks.md).

**Une branche par phase attribuée** (ou par spec pour les futures specs), créée depuis `main` à jour :

| Phase                                                                                 | Branche                                    | Responsable |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ----------- |
| 0. Brainstorm ([MAP_Projet.md](MAP_Projet.md) : problème, cible, identité, priorités) | — (doc, directement sur `main`)            | Ismael      |
| 2. Fondations + design system                                                         | `feat/phase2-fondations`                   | Nicolas     |
| 3. US1 Comptes                                                                        | `feat/us1-comptes`                         | Kelyan      |
| 4. US2 Mes annonces                                                                   | `feat/us2-annonces`                        | Ismael      |
| 5. US3 Isolation                                                                      | `feat/us3-isolation`                       | Nicolas     |
| 6. US4 Vitrine                                                                        | `feat/us4-vitrine`                         | Kelyan      |
| 7. US5 Messagerie                                                                     | `feat/us5-messagerie`                      | Ismael      |
| 8. Finitions                                                                          | `chore/finitions`                          | Nicolas     |
| Nouvelle spec (ex. `002-…`)                                                           | `002-nom-de-la-spec` (convention spec-kit) | qui la crée |

Règles :

- **Personne ne commit directement sur `main`** : tout passe par une Pull Request relue par un autre membre.
- Commits petits et fréquents sur sa branche ; `git pull origin main` (ou rebase) régulièrement pour récupérer le travail des autres.
- Avant la PR : `npm run lint && npm run build && npm test` dans le dossier modifié.
- Cocher ses tâches dans `tasks.md` dans la PR qui les termine.
- Fichiers partagés, sources de conflits : `frontend/src/App.tsx` (routes), `backend/src/app.ts` (montage des routeurs), `tasks.md`. N'y ajouter que ses lignes, sans réorganiser le reste.
- Une phase ne démarre qu'une fois sa dépendance mergée dans `main` (colonne « Démarre après » de `tasks.md`).

### spec-kit après un clone

spec-kit retrouve la spec courante grâce à `.specify/feature.json`, un fichier local non versionné.
À faire **une fois** après le clone, avant `/speckit-implement` :

```bash
echo '{ "feature_directory": "specs/001-marketplace-mvp" }' > .specify/feature.json
```

Le contrat d'API de référence est [`specs/001-marketplace-mvp/contracts/openapi.yaml`](specs/001-marketplace-mvp/contracts/openapi.yaml).

## Limites et évolutions

Bonus spécifiés avec spec-kit (spec, plan et tâches dans `specs/`) :

| Spec | Bonus | Priorité |
|---|---|---|
| [`002-favoris`](specs/002-favoris/spec.md) | Favoris liés au compte, page « Favoris », reprise des favoris du navigateur | ✅ fait |
| [`003-photos-annonces`](specs/003-photos-annonces/spec.md) | 0 à 5 photos par annonce, formats vérifiés, métadonnées retirées | ✅ fait |
| [`004-communes-fiables`](specs/004-communes-fiables/spec.md) | Communes officielles avec code postal, validées côté serveur | ✅ fait |
| [`005-paiement-demo`](specs/005-paiement-demo/spec.md) | Paiement Stripe **de démonstration** (mode test), une seule vente par annonce | ✅ fait |


- **Photos** stockées sur le disque du serveur (`UPLOADS_DIR`, défaut `backend/uploads/`, ignoré par git) : en production, il faudrait un volume persistant ou un stockage objet.
- **Communes** : référentiel officiel figé dans `backend/data/communes.json` (API Géo, octobre 2026) ; les anciennes annonces ambiguës (ex. « Saint-Denis ») restent en texte libre jusqu'à leur prochaine modification.
- **Messagerie** à sens unique : l'acheteur écrit au vendeur, mais le vendeur ne peut pas encore répondre dans Occaz (pas de fil de discussion ni de notification).
- **Paiement** de démonstration seulement : un vrai paiement entre particuliers demanderait Stripe Connect (compte vérifié par vendeur, reversement, frais).
