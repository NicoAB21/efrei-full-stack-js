---
description: "Tâches d'implémentation des communes fiables"
---

# Tasks: Communes fiables

**Input**: Design documents from `/specs/004-communes-fiables/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/communes.openapi.yaml](./contracts/communes.openapi.yaml)

**Tests**: OBLIGATOIRES (constitution V), sur le vrai référentiel, sans réseau.

**Organization**: US1 choisir sa commune, US2 refus serveur, US3 chercher par commune, US4 annonces
existantes (spec.md).

---

## Phase 1: Setup

- [x] T001 Créer `backend/scripts/fetch-communes.ts` : télécharge `https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,codeDepartement&format=json`, écarte les communes sans code postal, écrit `backend/data/communes.json` = `{ source, fetchedAt, communes: [[code, nom, département, [codes postaux]]] }` ; script `data:communes` dans `backend/package.json` (`tsx scripts/fetch-communes.ts`) ; l'exécuter une fois et versionner le fichier (~1,4 Mo)
- [x] T002 [P] Inclure `scripts/` dans le lint (`backend/eslint.config.js` couvre déjà `**/*.ts`) et vérifier que `data/` n'est pas ignoré par `.gitignore` / `.dockerignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Créer `backend/src/communes/index.ts` : chargement de `data/communes.json` (une fois, en mémoire) ; `normalize(s)` (minuscules, NFD sans accents, tirets/apostrophes/espaces multiples → un espace, `trim`) ; index `code → commune`, `nom normalisé → communes`, `code postal → communes` ; `findCommune(code)`, `checkLocation(cityCode, postalCode)` → commune ou `null` ; `communesByName(name)` ; `searchCommunes(q)` (préfixe du nom normalisé, ou début de code postal si `q` est numérique ; une suggestion par couple commune/code postal ; tri : nom exact d'abord, puis alphabétique, puis code postal ; 20 maximum ; `label` « Nom (code postal) »)
- [x] T004 [P] Écrire `backend/tests/communes.test.ts` (partie module) : `normalize('Saint-Étienne') === 'saint etienne'` ; Paris (75056) a 21 codes postaux, Lyon (69123) 9 ; `checkLocation('69123','69003')` OK, `('69123','75001')` → null, `('99999','69003')` → null ; 4 communes « Saint-Denis » ; communes d'outre-mer présentes (Saint-Denis de La Réunion, code officiel `97411`)
- [x] T005 Ajouter `cityCode` (string, défaut `null`), `postalCode` (string, défaut `null`) et `cityKey` (string, indexé avec `status` et `createdAt`) au schéma `backend/src/models/listing.ts` ; `cityKey` exclu des réponses (`toJSON`)

---

## Phase 3: User Story 1 - Choisir sa commune (Priority: P1) 🎯

### Tests ⚠️

- [x] T006 [P] [US1] Ajouter à `backend/tests/communes.test.ts` : `GET /api/communes?q=lyo` → 200, Lyon (69001…69009) en tête ; `q=69003` → Lyon (69003) ; `q=saint etienne` et `q=SAINT-ÉTIENNE` → Saint-Étienne ; `q=saint-denis` → 4 communes distinguées par département ; `q=97400` → Saint-Denis (La Réunion) ; `q` d'1 caractère ou absent → 400 ; 20 résultats maximum ; route publique (sans token)

### Implementation

- [x] T007 [US1] Créer `backend/src/routes/communes.ts` (`GET /` → `{ items: searchCommunes(q) }`, `q` validé par Zod 2 à 60 caractères après `trim`) et le monter sur `/api/communes` dans `backend/src/app.ts`
- [x] T008 [P] [US1] Créer `frontend/src/components/CommuneField.tsx` : combobox WAI-ARIA (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, liste `role="listbox"` / `role="option"`), requête `GET /api/communes` 250 ms après la dernière frappe (dès 2 caractères), flèches haut/bas, Entrée pour choisir, Échap pour fermer, région `aria-live` « N suggestions » ; valeur `{ cityCode, postalCode, label } | null` ; taper à nouveau efface le choix ; messages « Tapez au moins 2 caractères », « Aucune commune ne correspond »
- [x] T009 [P] [US1] Ajouter les styles `.combobox`, `.combobox-list`, `.combobox-option[aria-selected="true"]` à `frontend/src/design-system/components.css`
- [x] T010 [US1] Dans `frontend/src/pages/ListingForm.tsx` : remplacer le champ « Ville » par `CommuneField` (« Commune ») ; validation « Choisissez une commune dans la liste » ; envoyer `cityCode` + `postalCode` (plus `city`) ; en modification d'une annonce rattachée, préremplir « Ville (code postal) » ; d'une annonce non rattachée, champ vide + message « Choisissez la commune de cette annonce »
- [x] T011 [US1] Afficher « Commune (code postal) » dans `frontend/src/pages/ListingDetail.tsx` et `frontend/src/pages/PublicListing.tsx` (texte seul si `postalCode` absent) ; types `cityCode`, `postalCode` dans `frontend/src/constants.ts` et `ListingInput` de `frontend/src/listings.ts`

---

## Phase 4: User Story 2 - Refus des communes inventées (Priority: P1) 🎯

### Tests ⚠️

- [x] T012 [P] [US2] Ajouter à `backend/tests/communes.test.ts` : création avec `cityCode` inexistant → 400 ; code postal d'une autre commune → 400 ; `city` envoyé → 400 ; `cityCode` sans `postalCode` (et inversement) → 400 ; couple valide → 201 avec `city: "Lyon"`, `cityCode`, `postalCode`, sans `cityKey` ; PATCH vers une autre commune valide → 200 et nom officiel mis à jour
- [x] T013 [US2] Adapter les tests existants à la nouvelle entrée (`city` → `cityCode` + `postalCode`, ex. Lyon `69123` / `69001`) : `backend/tests/listings.test.ts` (dont les cas 400 « ville vide / 81 caractères » remplacés par « cityCode mal formé / code postal mal formé »), `isolation.test.ts`, `favorites.test.ts`, `public.test.ts`, `photos.test.ts` ; forme de réponse attendue avec `cityCode` et `postalCode`

### Implementation

- [x] T014 [US2] Dans `backend/src/schemas/listing.ts` : `listingCreateSchema` sans `city`, avec `cityCode` (`/^[0-9][0-9AB][0-9]{3}$/`) et `postalCode` (`/^[0-9]{5}$/`) requis ; `listingUpdateSchema` : les deux facultatifs mais ensemble (refine) ; garder le refus des champs inconnus
- [x] T015 [US2] Dans `backend/src/services/listing.service.ts` : `create`/`update` vérifient `checkLocation` (sinon `invalidInput('Commune ou code postal inconnu : choisissez une commune dans la liste')`), posent `city` = nom officiel et `cityKey` = `normalize(nom)` ; `update` d'une annonce sans `cityCode` qui n'en fournit pas → 400 (FR-008)

---

## Phase 5: User Story 3 - Chercher par commune (Priority: P2)

### Tests ⚠️

- [x] T016 [P] [US3] Adapter / compléter `backend/tests/public.test.ts` : annonces à Lyon 69001 et 69003 → `city=lyon` et `city=LYON` renvoient les deux ; `cityCode=69123` aussi ; `city=saint etienne` trouve Saint-Étienne ; annonce ancienne non rattachée (insérée directement en base avec `city: 'Paris (centre)'`) toujours trouvée par `city=(centre)` (caractères spéciaux échappés) ; `cityCode` mal formé → 400

### Implementation

- [x] T017 [US3] Dans `backend/src/schemas/listing.ts`, ajouter `cityCode` facultatif à `publicQuerySchema` ; dans `listPublic` : `cityCode` → égalité ; `city` → `$or: [{ cityKey: normalize(city) }, { cityCode: null, city: regex échappée }]`
- [x] T018 [US3] Dans `frontend/src/pages/Home.tsx` : champ Ville du hero = `CommuneField` en mode recherche (choisir une suggestion pose `cityCode`, sinon le texte saisi part en `city`) ; « Près de chez vous » regroupe par `cityCode` (repli sur le nom pour les anciennes annonces) et filtre par `cityCode` ; libellé du filtre actif lisible

---

## Phase 6: User Story 4 - Annonces existantes (Priority: P2)

### Tests ⚠️

- [x] T019 [P] [US4] Écrire `backend/tests/migrate-communes.test.ts` : annonces insérées en base avec `city` « lyon », « Saint-Étienne », « Saint-Denis », « Lyonnn » ; `migrateCommunes()` rattache les deux premières (`cityCode`, `city` officiel, `cityKey`, `postalCode` seulement si la commune n'en a qu'un) et laisse les deux autres ; relancer ne change rien ; renvoie `{ attached, left }`

### Implementation

- [x] T020 [US4] Créer `backend/src/communes/migrate.ts` (`migrateCommunes()`) et `backend/scripts/migrate-communes.ts` (connexion `MONGODB_URI`, affiche « N rattachées, M laissées ») ; script `migrate:communes` dans `backend/package.json`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T021 [P] Fusionner `contracts/communes.openapi.yaml` dans `backend/openapi.yaml` (route `/api/communes`, `ListingCreate`/`ListingUpdate` : `cityCode` + `postalCode` au lieu de `city` ; `Listing` : + `cityCode`, `postalCode` ; vitrine : paramètre `cityCode`) ; `tests/openapi.test.ts` doit passer
- [x] T022 [P] Mettre à jour `README.md` (fonctionnalités, tests, commandes `data:communes` / `migrate:communes`, limites) et `specs/001-marketplace-mvp/quickstart.md` (corps `curl` avec `cityCode`/`postalCode`)
- [x] T023 Contre-épreuve : remplacer `checkLocation` par une fonction qui accepte tout → les tests US2 DOIVENT échouer, puis restaurer depuis une copie → **fait le 2026-10-28** : 4 tests échouent ; restauré à l'identique, 77/77
- [x] T024 Dérouler [quickstart.md](./quickstart.md) : lint, build, tests ; parcours navigateur (stack jetable, sans conteneurs) : suggestions au clavier, publication, refus d'un texte libre, recherche « lyon », puces → back 188/188, front 9/9 ; parcours OK ; corrigés à cette étape : texte des suggestions invisible dans le hero (couleur héritée), département renvoyé à la ligne ; filigrane du hero passé en image de fond pour ne pas couper la liste

---

## Dependencies & Execution Order

- Setup (référentiel) → Foundational (module) → US1 → US2 → US3 → US4 → Polish
- T013 (adaptation des tests) doit suivre T014/T015 de près : la suite reste rouge entre les deux

### Parallel Opportunities

- T004 et T005 ; T006, T008, T009 ; T012 et T016 ; T019 ; T021 et T022

## Implementation Strategy

1. Référentiel + module + route de suggestions (US1 côté API)
2. Validation serveur et adaptation des tests (US2) : point de bascule du contrat
3. Formulaire et affichage (US1 front), recherche (US3), migration (US4), puis Polish
