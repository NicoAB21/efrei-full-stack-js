---
description: "Tâches d'implémentation d'Occaz — MVP de petites annonces"
---

# Tasks: Occaz — MVP de petites annonces entre particuliers

**Input**: Design documents from `/specs/001-marketplace-mvp/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml)

**Tests**: OBLIGATOIRES (constitution, principe V) : Jest + Supertest côté back-end, écrits avant
l'implémentation de chaque story et devant échouer d'abord.

**Organization**: une phase par user story ; US1–US3 = MVP évalué, US4 (P2) et US5 (P3) = extensions.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, aucune dépendance sur une tâche non terminée)
- **[Story]**: US1 … US5 (cf. spec.md)
- Chemins : `backend/src/`, `backend/tests/`, `frontend/src/`

## Travail en équipe

- **Une branche par phase attribuée** (noms dans le [README](../../README.md#travailler-à-plusieurs)), créée depuis `main` ; jamais de commit direct sur `main`, tout passe par une PR relue.
- Cocher la tâche dans ce fichier dans la PR qui la termine.

| Phase | Responsable | Tâches | Démarre après |
|---|---|---|---|
| 1. Setup | Nicolas | T001–T009 | — (fait) |
| 2. Fondations + design system | Nicolas | T010–T019, T056 | Phase 1 |
| 3. US1 Comptes | Kelyan | T020–T027 | Phase 2 |
| 4. US2 Mes annonces | Ismael | T028–T038 | Phase 2 (en parallèle de US1) |
| 5. US3 Isolation A/B | Nicolas | T039–T041 | US2 |
| 6. US4 Vitrine publique | Kelyan | T042–T047 | US3 (MVP fini) |
| 7. US5 Messagerie | Ismael | T048–T051 | US4 |
| 8. Finitions | Nicolas (+ relecture de chacun) | T052–T055 | fin |

Pendant la Phase 2, Kelyan et Ismael peuvent déjà écrire les tests de leur story
(T020, T028–T030) à partir du contrat OpenAPI : ils doivent échouer tant que le code n'existe pas.
- Le contrat [contracts/openapi.yaml](./contracts/openapi.yaml) fait foi : front et back peuvent
  avancer en parallèle dès la fin de la Phase 2.

---

## Phase 1: Setup (Shared Infrastructure)

**Assigné à** : Nicolas

**Purpose**: squelette des deux projets et lancement par Docker Compose

- [x] T001 Créer `.gitignore` racine (`node_modules/`, `dist/`, `.env`, `coverage/`) et `README.md` racine (lancement Docker, lancement local, commandes lint/build/test)
- [x] T002 Initialiser `backend/package.json` (type module, scripts `dev` = `tsx watch src/server.ts`, `build` = `tsc`, `start` = `node dist/server.js`, `lint` = `eslint .`, `test` = `jest`) avec dépendances express@5, mongoose@8, bcrypt, jsonwebtoken, zod, swagger-ui-express, yaml et devDependencies typescript, tsx, @types/*, jest, ts-jest, supertest, mongodb-memory-server, eslint, typescript-eslint
- [x] T003 [P] Créer `backend/tsconfig.json` (target ES2022, module NodeNext, strict, outDir `dist`, rootDir `src`), `backend/eslint.config.js` (typescript-eslint recommended) et `backend/jest.config.js` (preset ts-jest ESM, `testMatch` `tests/**/*.test.ts`)
- [x] T004 [P] Créer `backend/.env.example` avec `PORT=3000`, `MONGODB_URI=mongodb://localhost:27017/occaz`, `JWT_SECRET=change-me-dev-only`
- [x] T005 Créer `backend/src/app.ts` exportant `createApp()` (express.json, `GET /api/health` → `200 {"status":"ok"}`) et `backend/src/server.ts` (lit `PORT`, `MONGODB_URI`, `JWT_SECRET` ; refuse de démarrer si `JWT_SECRET` absent ; `mongoose.connect` puis `listen`)
- [x] T006 [P] Initialiser `frontend/` avec Vite React TypeScript (`package.json` scripts `dev`, `build`, `preview`, `lint`), ajouter `react-router`, et configurer `frontend/vite.config.ts` avec un proxy `/api` vers `process.env.API_PROXY_TARGET ?? "http://localhost:3000"` pour `server` et `preview`
- [x] T007 [P] Créer `backend/Dockerfile` et `frontend/Dockerfile` (image `node:24`, `npm ci`, commande `npm run dev`) et `.dockerignore` dans chaque dossier (`node_modules`, `dist`, `.env`)
- [x] T008 Créer `docker-compose.yml` racine : service `mongo` (mongo:7, port 27017, volume nommé `mongo-data`), `backend` (build `./backend`, port 3000, env `MONGODB_URI=mongodb://mongo:27017/occaz`, `JWT_SECRET` de dev, code monté en volume + volume anonyme `node_modules`), `frontend` (build `./frontend`, port 5173, `API_PROXY_TARGET=http://backend:3000`, même logique de volumes)
- [x] T009 Vérifier : `npm run lint` et `npm run build` passent dans `backend/` et `frontend/` ; `docker compose up --build` puis `curl localhost:3000/api/health` → `{"status":"ok"}` et `localhost:5173` s'affiche

---

## Phase 2: Foundational (Blocking Prerequisites)

**Assigné à** : Nicolas

**Purpose**: briques communes à toutes les stories

**⚠️ CRITICAL**: aucune user story avant la fin de cette phase

- [x] T010 Créer `backend/src/errors.ts` : classe `HttpError(status, code, message)` avec les codes `INVALID_INPUT` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `EMAIL_ALREADY_USED` (409) ; middleware d'erreur qui renvoie `{"error":{"code","message"}}`, traduit `ZodError` et le JSON mal formé de `express.json` en 400 `INVALID_INPUT`, toute autre erreur en 500 sans fuite de détail
- [x] T011 Brancher dans `backend/src/app.ts` : 404 `NOT_FOUND` au format d'erreur pour toute route `/api` inconnue, puis le middleware d'erreur de T010
- [x] T012 [P] Créer `backend/src/middleware/auth.ts` : lit `Authorization: Bearer <jwt>`, vérifie avec `JWT_SECRET` (HS256), pose `req.userId = payload.sub` ; absent, invalide ou expiré → `HttpError(401, "UNAUTHORIZED")`. Déclarer `userId?: string` sur `Request` dans `backend/src/types/express.d.ts`
- [x] T013 [P] Créer `backend/src/schemas/common.ts` : `objectIdParam` = `z.string().regex(/^[a-f0-9]{24}$/i)` (id mal formé → 400) ; helper `toJSON` commun pour les modèles Mongoose (`_id` → `id` string, supprime `__v` et `passwordHash`)
- [x] T014 [P] Créer `backend/tests/setup.ts` : démarre `mongodb-memory-server` avant tous les tests, connecte Mongoose, vide toutes les collections avant chaque test, ferme tout à la fin ; fixe `process.env.JWT_SECRET` de test ; référencer dans `backend/jest.config.js` (`setupFilesAfterEnv`)
- [x] T015 [P] Écrire `backend/tests/health.test.ts` : `GET /api/health` → 200 `{"status":"ok"}` ; `GET /api/inconnue` → 404 `NOT_FOUND` ; corps JSON mal formé → 400 `INVALID_INPUT`
- [x] T016 [P] Servir la doc dans `backend/src/app.ts` : copier `specs/001-marketplace-mvp/contracts/openapi.yaml` vers `backend/openapi.yaml`, le charger avec `yaml` et le monter via `swagger-ui-express` sur `/api/docs`
- [x] T017 [P] Créer `frontend/src/api.ts` : `apiFetch(path, options)` sur URL relatives `/api/...`, ajoute `Authorization: Bearer` si un token existe, parse `{"error":{"code","message"}}` en exception typée `ApiError(status, code, message)` ; sur 401 vide la session et redirige vers `/login?expired=1`
- [x] T018 [P] Créer `frontend/src/price.ts` : `formatPrice(cents)` → `"123,45 €"` (`Intl.NumberFormat("fr-FR", {style:"currency", currency:"EUR"})`) et `parsePrice(euros: string)` → centimes entiers ou `null` (accepte `85`, `85,5`, `85.50`) ; `frontend/src/constants.ts` avec les catégories (`vehicules` → « Véhicules », `immobilier` → « Immobilier », `multimedia` → « Multimédia », `maison` → « Maison », `mode` → « Mode », `loisirs` → « Loisirs », `autre` → « Autre ») et statuts (`available` → « Disponible », `sold` → « Vendue »)
- [x] T019 Créer la coquille front `frontend/src/App.tsx` + `frontend/src/main.tsx` : React Router, en-tête avec navigation, routes vides `/login`, `/register`, `/listings`, `/listings/new`, `/listings/:id`, `/listings/:id/edit` ; `frontend/src/index.css` responsive (pas de défilement horizontal à 375 px, `:focus-visible` marqué)
- [x] T056 [P] Design system « Étiquette » (charte d'Ismael dans `MAP_Projet.md`, DA validée sur maquettes, intégration Nicolas) : `frontend/src/design-system/` (`tokens.css`, `components.css`, police Inter hébergée + OFL, `brand/` logo + favicon « oz » + `gen-logo.py`, `GUIDE.md`, `README.md`), résumé dans `docs/design-system.md`, icônes Lucide (`lucide-react`), composants accessibles dans `frontend/src/components/` : `Button`, `Field`, `Alert`, `Logo`, `PriceTag`, `StatusBadge`, `CategoryIcon`, `ListingCard`, `EmptyState` ; en-tête et pied de page dans `App.tsx` ; page `/design` = référence vivante

**Checkpoint**: fondations prêtes ; back et front peuvent avancer en parallèle ; les pages des stories utilisent les composants et classes du design system (cf. `frontend/src/design-system/GUIDE.md`)

---

## Phase 3: User Story 1 - Créer un compte et se connecter (Priority: P1) 🎯 MVP

**Assigné à** : Kelyan

**Goal**: inscription, connexion, session persistante et déconnexion

**Independent Test**: créer un compte, se déconnecter, se reconnecter ; un mauvais mot de passe est refusé avec un message neutre

### Tests for User Story 1 ⚠️

- [ ] T020 [P] [US1] Écrire `backend/tests/auth.test.ts` : register → 201 `{"user":{"id","email"},"token"}` sans `password`/`passwordHash`/`_id` ; email renvoyé en minuscules ; `alice@example.test` après `Alice@Example.test` → 409 `EMAIL_ALREADY_USED` ; mot de passe de 7 caractères ou email invalide → 400 ; champ inconnu → 400 ; login correct → 200 ; mauvais mot de passe et email inconnu → 401 `UNAUTHORIZED` avec le même message

### Implementation for User Story 1

- [ ] T021 [P] [US1] Créer `backend/src/models/user.ts` : `email` string requis, `trim`, `lowercase`, **index unique** ; `passwordHash` string requis ; `timestamps: true` ; `toJSON` commun de T013
- [ ] T022 [P] [US1] Créer `backend/src/schemas/auth.ts` : `credentialsSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8) }).strict()`
- [ ] T023 [US1] Créer `backend/src/services/auth.service.ts` : `register` (bcrypt coût 10, erreur Mongo `11000` → 409 `EMAIL_ALREADY_USED`), `login` (message neutre unique « Email ou mot de passe incorrect » → 401), `signToken(userId)` (jsonwebtoken, `{ sub }`, `expiresIn: "2h"`)
- [ ] T024 [US1] Créer `backend/src/controllers/auth.controller.ts` et `backend/src/routes/auth.ts` (`POST /api/auth/register` → 201, `POST /api/auth/login` → 200, réponse `{ user: { id, email }, token }`), monter dans `backend/src/app.ts`
- [ ] T025 [P] [US1] Créer `frontend/src/auth.tsx` : `AuthProvider` + `useAuth()` (`user`, `token`, `login`, `register`, `logout`), token et user persistés dans `localStorage` ; composant `RequireAuth` qui redirige vers `/login`
- [ ] T026 [US1] Créer `frontend/src/pages/Register.tsx` et `frontend/src/pages/Login.tsx` : labels explicites, validation UX (email, ≥ 8 caractères), erreurs serveur lisibles, état de chargement, redirection vers `/listings` ; `Login` affiche « Session expirée, reconnectez-vous » si `?expired=1`
- [ ] T027 [US1] Ajouter l'état connecté dans l'en-tête de `frontend/src/App.tsx` (email + bouton « Se déconnecter ») et protéger les routes `/listings*` avec `RequireAuth`

**Checkpoint**: US1 fonctionnelle et testée

---

## Phase 4: User Story 2 - Gérer ses propres annonces (Priority: P1) 🎯 MVP

**Assigné à** : Ismael

**Goal**: CRUD complet des annonces du vendeur connecté

**Independent Test**: créer, lister, modifier, supprimer une annonce ; elle persiste après redémarrage du serveur

### Tests for User Story 2 ⚠️

- [x] T028 [P] [US2] Écrire `backend/tests/listings.test.ts` : parcours CRUD nominal (POST 201, GET liste `{"items":[...]}` plus récentes d'abord, GET :id 200, PATCH prix seul → seul le prix change, PATCH `status: "sold"`, DELETE 204 sans corps puis GET → 404) ; réponses avec `id` et `ownerId` string, jamais `_id`. Les tokens de test sont signés directement avec `jsonwebtoken` et `JWT_SECRET` de test sur des ObjectId générés (pas de dépendance aux routes d'US1)
- [x] T029 [P] [US2] Ajouter à `backend/tests/listings.test.ts` les cas 400 : titre vide ou `"   "`, titre de 121 caractères, description de 2001 caractères, `priceCents` 0, -5, 12.5, `"85"`, `9007199254740992` ; `priceCents` 1 accepté ; catégorie inconnue ; ville vide ou de 81 caractères ; statut inconnu ; champ inconnu ; `id` ou `ownerId` dans le corps ; PATCH `{}` ; id mal formé `abc` sur GET/PATCH/DELETE
- [x] T030 [P] [US2] Ajouter à `backend/tests/listings.test.ts` les cas 401 : sans header, `Bearer` invalide, token signé avec un autre secret, token expiré, sur les 5 routes

### Implementation for User Story 2

- [x] T031 [P] [US2] Créer `backend/src/models/listing.ts` : `ownerId` ObjectId ref User requis ; `title` string requis ; `description` string défaut `""` ; `priceCents` number requis ; `category` enum `vehicules|immobilier|multimedia|maison|mode|loisirs|autre` ; `city` string requis ; `status` enum `available|sold` défaut `available` ; `timestamps: true` ; index `{ ownerId: 1, createdAt: -1 }` et `{ status: 1, createdAt: -1 }` ; `toJSON` commun (avec `ownerId` en string)
- [x] T032 [P] [US2] Créer `backend/src/schemas/listing.ts` : `listingCreateSchema` strict — `title` « après `trim` : 1 à 120 caractères », `description` « 0 à 2000 caractères » facultatif, `priceCents` `z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)`, `category` enum des 7 codes, `city` « après `trim` : 1 à 80 caractères », `status` enum facultatif ; `listingUpdateSchema = listingCreateSchema.partial().strict()` + refine « au moins une clé »
- [x] T033 [US2] Créer `backend/src/services/listing.service.ts` : `list(userId)`, `get(userId, id)`, `create(userId, data)`, `update(userId, id, data)`, `remove(userId, id)` ; **toute** requête filtre sur `{ _id: id, ownerId: userId }` ; aucun résultat → `HttpError(404, "NOT_FOUND")`
- [x] T034 [US2] Créer `backend/src/controllers/listing.controller.ts` et `backend/src/routes/listings.ts` : middleware `auth` sur tout le routeur, validation de `:id` avec `objectIdParam` avant le service, `GET /` → `{ items }`, `POST /` → 201, `GET /:id`, `PATCH /:id` → 200, `DELETE /:id` → 204 sans corps ; monter sur `/api/listings` dans `backend/src/app.ts`
- [x] T035 [P] [US2] Créer `frontend/src/pages/MyListings.tsx` : liste des annonces (titre, prix `formatPrice`, catégorie, ville, statut), état vide « Vous n'avez pas encore d'annonce » + lien « Publier une annonce », chargement et erreur
- [x] T036 [P] [US2] Créer `frontend/src/pages/ListingForm.tsx` (création et édition) : champs labellisés, prix saisi en euros converti par `parsePrice`, select catégorie, select statut en édition, erreurs lisibles par champ, envoi du seul diff en PATCH
- [x] T037 [US2] Créer `frontend/src/pages/ListingDetail.tsx` : détail d'une annonce du vendeur, boutons « Modifier », « Marquer vendue / disponible », « Supprimer » avec `window.confirm`, message de succès ; « Annonce introuvable » sur 404
- [x] T038 [US2] Brancher les pages US2 dans `frontend/src/App.tsx` (`/listings`, `/listings/new`, `/listings/:id`, `/listings/:id/edit`)

**Checkpoint**: US1 + US2 fonctionnelles

---

## Phase 5: User Story 3 - Isolation entre deux vendeurs (Priority: P1) 🎯 MVP

**Assigné à** : Nicolas

**Goal**: preuve automatisée que B ne peut rien faire sur les annonces de A

**Independent Test**: A et B ont chacun une annonce ; toute action de B sur l'annonce de A → 404

### Tests for User Story 3 ⚠️

- [ ] T039 [US3] Écrire `backend/tests/isolation.test.ts` : A et B créent chacun une annonce ; `GET /api/listings` de B ne contient que la sienne ; B fait `GET`, `PATCH`, `DELETE` sur l'annonce de A → 404 `NOT_FOUND` avec un corps identique à celui d'un id inexistant ; après le PATCH et le DELETE de B, l'annonce de A est inchangée et existe toujours
- [ ] T040 [US3] Contre-épreuve manuelle : retirer temporairement `ownerId` du filtre dans `backend/src/services/listing.service.ts`, vérifier que `isolation.test.ts` échoue, puis restaurer (noter le résultat dans la PR)

### Implementation for User Story 3

- [ ] T041 [US3] Corriger dans `backend/src/services/listing.service.ts` tout écart révélé par T039 (aucune requête sans `ownerId`) et vérifier dans `frontend/src/pages/ListingDetail.tsx` qu'une URL vers l'annonce d'un autre compte affiche « Annonce introuvable »

**Checkpoint**: MVP complet (US1–US3), tous les tests verts — **ne pas commencer P2 avant**

---

## Phase 6: User Story 4 - Parcourir et rechercher les annonces publiées (Priority: P2)

**Assigné à** : Kelyan

**Goal**: vitrine publique en lecture seule avec filtres

**Independent Test**: un visiteur non connecté voit les annonces disponibles (pas les vendues), filtre par catégorie, ouvre un détail sans email du vendeur

### Tests for User Story 4 ⚠️

- [ ] T042 [P] [US4] Écrire `backend/tests/public.test.ts` : sans token, `GET /api/public/listings` renvoie les annonces `available` de tous les vendeurs, jamais les `sold`, plus récentes d'abord, 50 max ; filtres `category`, `city` (insensible à la casse), `q` (titre ou description, insensible à la casse, caractères regex échappés), `minPrice`/`maxPrice` ; paramètre invalide (catégorie inconnue, prix non entier) → 400 ; `GET /api/public/listings/:id` d'une annonce `sold` → 404 ; aucune réponse ne contient d'email ; les 5 routes privées gardent leur comportement

### Implementation for User Story 4

- [ ] T043 [P] [US4] Ajouter `publicQuerySchema` dans `backend/src/schemas/listing.ts` (`category` enum, `city` ≤ 80, `q` ≤ 100, `minPrice`/`maxPrice` entiers ≥ 1 via `z.coerce`, strict)
- [ ] T044 [US4] Ajouter `listPublic(filters)` et `getPublic(id)` dans `backend/src/services/listing.service.ts` (filtre `status: "available"`, tri `createdAt: -1`, `limit(50)`, regex échappée pour `q` et `city`)
- [ ] T045 [US4] Créer `backend/src/routes/public.ts` (sans middleware auth) et le monter sur `/api/public/listings` dans `backend/src/app.ts`
- [ ] T046 [P] [US4] Créer `frontend/src/pages/Home.tsx` : formulaire de filtres labellisé (catégorie, ville, mot-clé, prix min/max en euros), liste en grille responsive, « Aucune annonce » si vide ; route `/` dans `frontend/src/App.tsx`
- [ ] T047 [US4] Créer `frontend/src/pages/PublicListing.tsx` (route `/annonces/:id`) : titre, description, prix, catégorie, ville, date ; aucune donnée vendeur

**Checkpoint**: vitrine publique opérationnelle, MVP intact

---

## Phase 7: User Story 5 - Contacter le vendeur (Priority: P3)

**Assigné à** : Ismael

**Goal**: messagerie acheteur → vendeur par annonce

**Independent Test**: B écrit sur l'annonce de A ; A voit le message ; C ne le voit pas

### Tests for User Story 5 ⚠️

- [ ] T048 [P] [US5] Écrire `backend/tests/messages.test.ts` : B → 201 sur l'annonce disponible de A ; A le voit dans `GET /api/messages` ; C ne le voit pas ; A sur sa propre annonce → 400 ; annonce `sold` ou inexistante → 404 ; sans token → 401 ; `body` vide, `"   "` ou > 1000 caractères → 400

### Implementation for User Story 5

- [ ] T049 [P] [US5] Créer `backend/src/models/message.ts` : `listingId`, `senderId`, `recipientId` ObjectId requis ; `body` « après `trim` : 1 à 1000 caractères » ; `timestamps: true` ; index `{ recipientId: 1, createdAt: -1 }`
- [ ] T050 [US5] Créer `backend/src/services/message.service.ts`, contrôleur et routes : `POST /api/public/listings/:id/messages` (auth requise, `recipientId` = `ownerId` calculé serveur) et `GET /api/messages` (reçus par `req.userId`) ; monter dans `backend/src/app.ts`
- [ ] T051 [US5] Front : formulaire « Contacter le vendeur » dans `frontend/src/pages/PublicListing.tsx` (masqué si `ownerId === user.id` ou non connecté) et page `frontend/src/pages/Messages.tsx` (route `/messages`)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Assigné à** : Nicolas (chacun relit sa partie)

- [ ] T052 [P] Mettre à jour `backend/openapi.yaml` pour qu'il corresponde exactement aux routes réellement implémentées
- [ ] T053 [P] Compléter `README.md` : présentation, prérequis, lancement Docker et local, variables d'environnement, commandes `lint`/`build`/`test`, lien Swagger, choix techniques
- [ ] T054 Passe accessibilité et mobile : parcours complet au clavier seul et à 375 px (SC-006), boutons nommés, focus visible dans `frontend/src/index.css`
- [ ] T055 Dérouler [quickstart.md](./quickstart.md) en entier ; vérifier qu'aucun secret, `.env` ou `node_modules` n'est versionné

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance — ✅ fait
- **Foundational (Phase 2)** : après Setup ; bloque toutes les stories
- **US1 (Phase 3)** : après Phase 2
- **US2 (Phase 4)** : après Phase 2 ; indépendante d'US1 (tokens de test signés directement, cf. T028), donc en parallèle
- **US3 (Phase 5)** : après US2 (teste son service)
- **US4 (Phase 6)** : après US3 (MVP terminé et testé, principe VI)
- **US5 (Phase 7)** : après US4 (route sous `/api/public/listings/:id`)
- **Polish (Phase 8)** : à la fin

### Within Each User Story

- Tests d'abord, ils doivent échouer
- Modèle et schéma → service → contrôleur/routes → pages front

### Parallel Opportunities

- Phase 2 : T012, T013, T014, T015, T016, T017, T018, T056 en parallèle (back et front séparés)
- Dès la Phase 2 finie, une personne sur le back US1→US2→US3, une autre sur le front US1→US2 en s'appuyant sur le contrat OpenAPI

---

## Parallel Example: User Story 2

```text
Ismael (back) : T028, T029, T030 (tests) puis T031 + T032 → T033 → T034
Ismael (front, après le back ou en parallèle avec le contrat) : T035 et T036 en parallèle → T037 → T038
```

---

## Implementation Strategy

### MVP First (US1 → US2 → US3)

1. Phase 1 (fait) + Phase 2
2. US1 → US2 → US3, tests verts à chaque étape, commit à chaque étape stable
3. **STOP** : MVP démontrable et livrable

### Incremental Delivery

4. US4 (vitrine) → tests → démo
5. US5 (messagerie) seulement s'il reste du temps
6. Polish
