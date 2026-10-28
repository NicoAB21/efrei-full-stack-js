---
description: "Tâches d'implémentation des photos d'annonces"
---

# Tasks: Photos des annonces

**Input**: Design documents from `/specs/003-photos-annonces/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/photos.openapi.yaml](./contracts/photos.openapi.yaml)

**Tests**: OBLIGATOIRES (constitution V). Images de test générées par `sharp` pendant les tests,
`UPLOADS_DIR` temporaire.

**Organization**: US1 ajout, US2 affichage, US3 organisation, US4 sécurité (spec.md). La sécurité (US4)
est testée dès US1 car elle conditionne l'ajout.

---

## Phase 1: Setup

- [x] T001 Installer `multer` et `sharp` dans `backend/` (`npm install multer sharp`, `@types/multer` en dev) ; vérifier que `sharp` se charge sans script d'installation (`node -e "require('sharp')"`)
- [x] T002 [P] Ajouter `backend/uploads/` à `.gitignore` et `UPLOADS_DIR` (commenté, défaut `uploads`) à `backend/.env.example` ; ajouter `UPLOADS_DIR: /app/uploads` à l'environnement du service `backend` dans `docker-compose.yml`
- [x] T003 [P] Relayer `/uploads` comme `/api` dans le proxy de `frontend/vite.config.ts` (`server` et `preview`)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Créer `backend/src/photos/process.ts` : `detectFormat(buffer)` par signature binaire (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF????WEBP`, sinon `null`) ; `processPhoto(buffer)` → `{ detail, card, width, height }` avec `sharp(buffer, { limitInputPixels: 40_000_000 }).rotate()` puis `resize({ width: 1600 | 480, withoutEnlargement: true }).webp({ quality: 80 })` (aucune métadonnée conservée) ; format refusé ou image illisible → `invalidInput` avec le nom du fichier
- [x] T005 [P] Créer `backend/src/photos/storage.ts` : `uploadsDir()` (`UPLOADS_DIR` ou `backend/uploads`, créé au besoin), `savePhoto({ detail, card })` → `{ id: randomUUID(), url: '/uploads/<id>-1600.webp', cardUrl: '/uploads/<id>-480.webp' }`, `deletePhotoFiles(id)` (`fs.rm`, `force: true`)
- [x] T006 Ajouter `photos` au schéma `backend/src/models/listing.ts` : sous-schéma `{ id, url, cardUrl, width, height }` sans `_id`, défaut `[]`, validation « 5 photos maximum »
- [x] T007 Dans `backend/src/errors.ts`, traduire les `MulterError` en `400 INVALID_INPUT` : `LIMIT_FILE_SIZE` → « Photo trop lourde : 5 Mo maximum », `LIMIT_FILE_COUNT` → « 5 photos maximum par envoi », `LIMIT_UNEXPECTED_FILE` → « Champ de fichier attendu : photos »
- [x] T008 Dans `backend/src/app.ts`, servir `uploadsDir()` sur `/uploads` avec `express.static` (`index: false`, `maxAge: '30d'`, `X-Content-Type-Options: nosniff`), avant le 404 `/api`

---

## Phase 3: User Story 1 - Ajouter des photos (Priority: P1) 🎯 + US4 Sécurité

**Goal**: ajouter 1 à 5 photos à son annonce, vérifiées et nettoyées

### Tests ⚠️

- [x] T009 [P] [US1] Écrire `backend/tests/photos.test.ts` (setup : `UPLOADS_DIR` = `fs.mkdtemp`, images générées par `sharp`) : 2 JPEG → 201, `photos.length === 2`, `photos[0]` principale, fichiers présents sur disque et servis en `image/webp` sur `/uploads/…` ; ajout ensuite jusqu'à 5 puis 6e → 400 ; envoi sans fichier → 400 ; sans token → 401
- [x] T010 [P] [US4] Ajouter à `backend/tests/photos.test.ts` : SVG, GIF, PDF et fichier texte renommé `.jpg` → 400 ; fichier de 6 Mo → 400 ; envoi mixte (1 JPEG valide + 1 SVG) → 400 et annonce inchangée (0 photo, 0 fichier écrit) ; JPEG avec EXIF GPS (`withExif`) → fichier servi sans EXIF (`sharp(file).metadata()` sans `exif`) ; image en orientation 6 → servie dans le bon sens (largeur/hauteur inversées) ; **isolation** : B `POST` sur l'annonce de A → 404 et annonce de A sans photo

### Implementation

- [x] T011 [US1] Créer `backend/src/services/photo.service.ts` : `add(userId, listingId, files)` → annonce `{ _id, ownerId }` sinon 404 ; `photos.length + files.length > 5` → 400 « 5 photos maximum par annonce » ; traiter **toutes** les photos avec `processPhoto` avant d'écrire, puis `savePhoto`, puis `$push` ; en cas d'échec de la base, supprimer les fichiers écrits ; renvoie l'annonce
- [x] T012 [US1] Créer `backend/src/controllers/photo.controller.ts` et ajouter dans `backend/src/routes/listings.ts` : `POST /:id/photos` avec `multer({ storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5 } }).array('photos', 5)` → 201 + annonce
- [x] T013 [P] [US1] Ajouter à `frontend/src/listings.ts` : `uploadPhotos(id, files)` (`FormData`, champ `photos`, sans `Content-Type` manuel) ; dans `frontend/src/api.ts`, ne pas forcer `Content-Type: application/json` quand le corps est un `FormData`
- [x] T014 [US1] Créer `frontend/src/components/PhotoPicker.tsx` : bouton « Ajouter des photos » (input `type="file"` caché, `accept="image/jpeg,image/png,image/webp"`, `multiple`), aperçus `URL.createObjectURL` (libérés au démontage), bouton « Retirer » par aperçu, contrôle navigateur (type, 5 Mo, 5 au total) avec message lisible ; nommé « Photos (5 maximum) »
- [x] T015 [US1] Dans `frontend/src/pages/ListingForm.tsx` (`NewListingPage`) : `PhotoPicker` dans le formulaire ; à la publication, `createListing` puis `uploadPhotos` ; si l'envoi des photos échoue, aller sur la page de modification avec le message « Annonce publiée, mais les photos n'ont pas pu être envoyées : … »

**Checkpoint**: ajout sécurisé testé et utilisable

---

## Phase 4: User Story 2 - Voir les photos (Priority: P1) 🎯

- [x] T016 [P] [US2] Ajouter `photos` au type `Listing` de `frontend/src/constants.ts` ; dans `frontend/src/components/ListingCard.tsx`, afficher `photos[0].cardUrl` (`<img alt="" loading="lazy">`, recadrée) à la place du pictogramme s'il existe ; grisée si vendue
- [x] T017 [P] [US2] Ajouter dans `frontend/src/design-system/components.css` : `.listing-card .media img` (couvre le carré, `object-fit: cover`, trou de l'étiquette en `--surface`) et `.gallery` (grande image 4:3 `object-fit: contain` sur `--soft`, vignettes boutons 64 px avec état actif)
- [x] T018 [US2] Créer `frontend/src/components/Gallery.tsx` : grande photo, vignettes en boutons (`aria-label` « Voir la photo N », `aria-current`), flèches gauche/droite au clavier, `alt` « {titre}, photo N sur M » ; rien si aucune photo
- [x] T019 [US2] Afficher `Gallery` dans `frontend/src/pages/PublicListing.tsx` et `frontend/src/pages/ListingDetail.tsx`
- [x] T020 [P] [US2] Ajouter à `backend/tests/photos.test.ts` : la vitrine (`GET /api/public/listings` et `/:id`) et `GET /api/favorites` renvoient `photos` ; une annonce sans photo renvoie `photos: []`

---

## Phase 5: User Story 3 - Organiser ses photos (Priority: P2)

### Tests ⚠️

- [x] T021 [P] [US3] Ajouter à `backend/tests/photos.test.ts` : `PATCH /:id/photos { order }` → 200 et nouvel ordre ; permutation invalide (id manquant, inconnu, doublon, champ en trop) → 400 ; `DELETE /:id/photos/:photoId` → 200, fichiers supprimés, la suivante devient principale ; photoId non uuid → 400, inconnu → 404 ; **isolation** B sur PATCH/DELETE → 404 et photos de A intactes ; suppression de l'annonce → tous ses fichiers supprimés

### Implementation

- [x] T022 [US3] Ajouter `reorder(userId, listingId, order)` et `remove(userId, listingId, photoId)` dans `backend/src/services/photo.service.ts` (filtre `{ _id, ownerId }`) ; schémas Zod : `order` = tableau d'uuid, permutation exacte ; `photoId` uuid
- [x] T023 [US3] Brancher `PATCH /:id/photos` et `DELETE /:id/photos/:photoId` dans `backend/src/routes/listings.ts` ; dans `backend/src/services/listing.service.ts`, `remove()` supprime les fichiers de toutes les photos
- [x] T024 [P] [US3] Ajouter à `frontend/src/listings.ts` : `reorderPhotos(id, order)` et `deletePhoto(id, photoId)`
- [x] T025 [US3] Créer `frontend/src/components/PhotoManager.tsx` (page de modification) : vignettes des photos existantes, boutons « ← », « → », « Photo principale », « Supprimer » (avec confirmation), « Ajouter des photos » (envoi immédiat), état et erreurs lisibles ; l'intégrer dans `EditListingPage` de `frontend/src/pages/ListingForm.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T026 [P] Fusionner `contracts/photos.openapi.yaml` dans `backend/openapi.yaml` (routes, schéma `Photo`, champ `photos` du schéma `Listing`) ; `tests/openapi.test.ts` doit passer
- [x] T027 [P] Mettre à jour `README.md` (fonctionnalités, tests, limites) et `docs/design-system.md` (photos sur les cartes, galerie)
- [x] T028 Contre-épreuve : retirer `ownerId` du filtre de `photo.service.ts` → les tests d'isolation DOIVENT échouer, puis restaurer depuis une copie → **fait le 2026-10-28** : 2 tests d'isolation échouent ; restauré à l'identique, 21/21
- [x] T029 Dérouler [quickstart.md](./quickstart.md) : lint, build, tests des deux projets ; parcours navigateur (stack jetable, sans les conteneurs) : publier avec photos, galerie au clavier, réordonner, supprimer, SVG refusé → back 163/163 (2 fois), front 9/9 ; parcours OK ; 4 fichiers restants sur disque, GPS présent à l'envoi et absent des fichiers servis

---

## Dependencies & Execution Order

- Setup → Foundational → US1 (+ US4) → US2 → US3 → Polish
- `processPhoto` (T004) et `storage` (T005) bloquent tout le reste côté back

### Parallel Opportunities

- T002, T003 ; T004 et T005 ; T009 et T010 ; T013 et T016/T017 ; T021 et T024 ; T026 et T027

## Implementation Strategy

1. Setup + Foundational + US1 avec ses tests de sécurité : ajout sûr de bout en bout
2. US2 : photos visibles partout (incrément démontrable)
3. US3 : organisation ; puis Polish
