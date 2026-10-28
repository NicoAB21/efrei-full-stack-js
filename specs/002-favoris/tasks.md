---
description: "Tâches d'implémentation des favoris liés au compte"
---

# Tasks: Favoris liés au compte

**Input**: Design documents from `/specs/002-favoris/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/favorites.openapi.yaml](./contracts/favorites.openapi.yaml)

**Tests**: OBLIGATOIRES (constitution V) : Jest + Supertest côté back, `node --test` pour la fusion côté front.

**Organization**: une phase par user story de la spec (US1 ajout, US2 page, US3 isolation, US4 reprise,
US5 visiteur).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, sans dépendance sur une tâche non terminée)
- **[Story]**: US1 … US5

---

## Phase 1: Setup

- [x] T001 Vérifier que `main`/`docs/specs-bonus` est à jour sur la branche `002-favoris` et que `npm test` passe dans `backend/` et `frontend/` avant toute modification

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 [P] Créer `backend/src/models/favorite.ts` : `userId` ObjectId requis, `listingId` ObjectId requis, `timestamps: { createdAt: true, updatedAt: false }` ; index `{ userId: 1, listingId: 1 }` **unique**, `{ userId: 1, createdAt: -1 }`, `{ listingId: 1 }`
- [x] T003 [P] Créer `backend/src/schemas/favorite.ts` : param `id` = `objectIdParam` (24 hex) ; corps d'import `z.strictObject({ listingIds: z.array(objectIdParam).max(200) })`
- [x] T004 Créer `backend/src/routes/favorites.ts` (`requireAuth` sur tout le routeur) et le monter sur `/api/favorites` dans `backend/src/app.ts`, avant le 404 `/api`

**Checkpoint**: route montée et protégée (401 sans token)

---

## Phase 3: User Story 1 - Mettre une annonce en favori (Priority: P1) 🎯

**Goal**: ajouter / retirer un favori, idempotent, refusé sur sa propre annonce, vendue ou inexistante

**Independent Test**: B `PUT` l'annonce de A deux fois → 204 et un seul favori ; `DELETE` → 204

### Tests for User Story 1 ⚠️

- [x] T005 [P] [US1] Écrire `backend/tests/favorites.test.ts` (partie ajout/retrait), comptes créés par `/api/auth/register` : `PUT /api/favorites/:id` → 204, rejoué → 204 et 1 seul document ; `DELETE` → 204 puis `DELETE` à nouveau → 404 ; sa propre annonce → 400 ; annonce vendue → 404 ; id inexistant → 404 ; id `abc` → 400 ; 200 favoris puis 201e → 400 avec message ; sans token → 401 sur les 3 routes

### Implementation for User Story 1

- [x] T006 [US1] Créer `backend/src/services/favorite.service.ts` : `add(userId, listingId)` (annonce `{ _id, status: 'available' }` sinon `notFound` ; `ownerId === userId` → `invalidInput("Vous ne pouvez pas mettre votre propre annonce en favori")` ; `countDocuments({ userId }) >= 200` → `invalidInput('200 favoris maximum')` ; `updateOne({ userId, listingId }, { $setOnInsert: {} }, { upsert: true })`, erreur de doublon `11000` ignorée) et `remove(userId, listingId)` (`deleteOne({ userId, listingId })`, `deletedCount === 0` → `notFound('Favori introuvable')`)
- [x] T007 [US1] Créer `backend/src/controllers/favorite.controller.ts` (`add` → 204, `remove` → 204) et brancher `PUT /:id` et `DELETE /:id` dans `backend/src/routes/favorites.ts`
- [x] T008 [P] [US1] Créer `frontend/src/favorites.tsx` : `FavoritesProvider` + `useFavorites()` → `{ ids: Set<string>, isFavorite(id), toggle(id), ready }` ; connecté : `GET /api/favorites` au montage puis `PUT`/`DELETE` avec mise à jour optimiste et retour arrière + message en cas d'erreur ; visiteur : `localStorage["occaz.favorites"]` (comportement actuel)
- [x] T009 [US1] Envelopper l'app avec `FavoritesProvider` dans `frontend/src/App.tsx` (à l'intérieur d'`AuthProvider`) et remplacer le `useFavorites` local de `frontend/src/pages/Home.tsx` par le hook du contexte (props `favorite`/`onToggleFavorite` de `ListingCard` inchangées) ; masquer le cœur si `listing.ownerId === user?.id`
- [x] T010 [US1] Ajouter un bouton « Ajouter aux favoris » / « Retirer des favoris » (`aria-pressed`, icône `Heart`) sur `frontend/src/pages/PublicListing.tsx`, masqué sur ses propres annonces

**Checkpoint**: US1 testée côté API et utilisable sur la vitrine et le détail

---

## Phase 4: User Story 2 - Retrouver ses favoris (Priority: P1) 🎯

**Goal**: page « Favoris » triée, vendue = « plus disponible », supprimée = absente

**Independent Test**: 3 favoris, l'un vendu, l'autre supprimé → la page montre 2 annonces dont 1 « plus disponible »

### Tests for User Story 2 ⚠️

- [x] T011 [P] [US2] Ajouter à `backend/tests/favorites.test.ts` : `GET /api/favorites` → `{ items }` du plus récent au plus ancien, `id` = id de l'annonce, `favoritedAt` présent, jamais `_id`/`email`/`passwordHash` ; annonce passée `sold` → présente avec `status: "sold"` ; annonce supprimée par son propriétaire → absente **et** document favori supprimé (vérifier `Favorite.countDocuments`)

### Implementation for User Story 2

- [x] T012 [US2] Ajouter `list(userId)` dans `backend/src/services/favorite.service.ts` : favoris triés `{ createdAt: -1 }`, annonces correspondantes lues avec les champs publics (`title description priceCents category city status createdAt updatedAt ownerId`), annonces manquantes écartées, chaque élément = annonce sérialisée + `favoritedAt` ; brancher `GET /` (200 `{ items }`)
- [x] T013 [US2] Dans `backend/src/services/listing.service.ts`, `remove()` supprime aussi `Favorite.deleteMany({ listingId: id })` après la suppression de l'annonce
- [x] T014 [P] [US2] Rendre `to` facultatif dans `frontend/src/components/ListingCard.tsx` (sans `to`, le titre n'est pas un lien) pour les annonces vendues
- [x] T015 [US2] Créer `frontend/src/pages/Favorites.tsx` (route `/favoris`) : titre « Mes favoris », chargement, erreur, `EmptyState` « Aucun favori » avec lien vers les annonces, grille `ListingCard` (vendue : sans lien + mention « Plus disponible »), cœur pour retirer
- [x] T016 [US2] Ajouter dans `frontend/src/App.tsx` la route `/favoris` et un lien « Favoris » (icône `Heart`, `nav-label`) dans l'en-tête

**Checkpoint**: US1 + US2 utilisables

---

## Phase 5: User Story 3 - Isolation des favoris (Priority: P1) 🎯

**Goal**: preuve que B ne voit ni ne retire les favoris de A

### Tests for User Story 3 ⚠️

- [x] T017 [US3] Ajouter à `backend/tests/favorites.test.ts` un `describe('isolation')` : A et B ont des favoris différents ; `GET` de B ne contient que les siens ; B `DELETE /api/favorites/<annonce dans les favoris de A seulement>` → 404 et le favori de A existe toujours ; token falsifié → 401
- [x] T018 [US3] Contre-épreuve : retirer temporairement `userId` du filtre de `list()` puis de `remove()` dans `backend/src/services/favorite.service.ts`, vérifier que les tests d'isolation échouent, restaurer ; noter le résultat dans ce fichier → **fait le 2026-10-28** : `userId` retiré de `list()` seul → 1 test échoue ; de `remove()` seul → 1 test échoue ; restauré → 14/14

**Checkpoint**: favoris isolés et prouvés

---

## Phase 6: User Story 4 - Reprendre les favoris du navigateur (Priority: P2)

**Goal**: à la connexion, les favoris `localStorage` rejoignent le compte sans doublon

### Tests for User Story 4 ⚠️

- [x] T019 [P] [US4] Ajouter à `backend/tests/favorites.test.ts` : `POST /api/favorites/import { listingIds }` → 200 `{ items }` = ids réellement importés ; doublons, annonces vendues, inexistantes et siennes ignorés ; plus de 200 ids → 400 ; id mal formé → 400 ; champ inconnu → 400 ; import qui ferait dépasser 200 favoris → importe jusqu'à 200 puis s'arrête
- [x] T020 [P] [US4] Écrire `frontend/src/favorites-merge.test.ts` : `readLocalFavorites()` tolère un JSON invalide (→ `[]`), dédoublonne, ne garde que des ids de 24 hex, plafonne à 200

### Implementation for User Story 4

- [x] T021 [US4] Ajouter `importMany(userId, listingIds)` dans `backend/src/services/favorite.service.ts` (annonces `available` et `ownerId ≠ userId`, dans la limite de 200 au total, `insertMany` avec `ordered: false` ou boucle d'`upsert`) et brancher `POST /import` (avant `/:id` dans le routeur)
- [x] T022 [P] [US4] Créer `frontend/src/favorites-merge.ts` : `readLocalFavorites()` et `clearLocalFavorites()` (fonctions pures, utilisées par `favorites.tsx`)
- [x] T023 [US4] Dans `frontend/src/favorites.tsx`, quand l'utilisateur passe de visiteur à connecté : `POST /api/favorites/import` avec `readLocalFavorites()`, puis `clearLocalFavorites()` et rechargement de `GET /api/favorites` ; un échec n'empêche pas la session (message discret)

---

## Phase 7: User Story 5 - Visiteur non connecté (Priority: P2)

**Goal**: le visiteur garde ses favoris dans le navigateur et est invité à se connecter

- [x] T024 [US5] Au premier clic sur un cœur en visiteur, afficher une fois une invitation « Connectez-vous pour retrouver vos favoris sur tous vos appareils » (lien `/login`) dans `frontend/src/favorites.tsx` ou la page concernée
- [x] T025 [US5] Dans `frontend/src/pages/Favorites.tsx`, en visiteur : charger chaque favori local via `GET /api/public/listings/:id` (404 → ignoré), afficher la grille et un encart « Connectez-vous pour garder vos favoris »

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T026 [P] Fusionner `specs/002-favoris/contracts/favorites.openapi.yaml` dans `backend/openapi.yaml` (tag `favorites`, schéma `FavoriteListing`) ; `tests/openapi.test.ts` doit passer
- [x] T027 [P] Mettre à jour `README.md` (fonctionnalités, tableau des tests, limites : favoris liés au compte) et `docs/design-system.md` (favoris)
- [x] T028 Dérouler [quickstart.md](./quickstart.md) : `lint`, `build`, `test` des deux projets, scénarios curl, parcours navigateur à 375 px et au clavier → back 139/139 (stable 3 fois et sous charge), front 7/7 ; parcours navigateur visiteur → connexion (import, localStorage vidé) → détail → vendue « Plus disponible » → retrait → vendeur sans cœur : OK ; en-tête mobile recompacté (lien Favoris ajouté)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2 → US3 ; US4 et US5 après US1 (elles réutilisent `favorites.tsx`)
- Dans chaque story : tests d'abord (ils échouent), puis service, contrôleur/route, puis front
- T013 (suppression des favoris) modifie `listing.service.ts` : seule tâche qui touche le code du MVP côté back

### Parallel Opportunities

- T002 et T003 ; T005 et T008 ; T011 et T014 ; T019, T020 et T022 ; T026 et T027

## Implementation Strategy

1. Phases 1–2, puis US1 + US2 + US3 (favoris en base, page, isolation prouvée) : incrément démontrable
2. US4 + US5 (reprise du navigateur, visiteur)
3. Polish : OpenAPI, README, quickstart
