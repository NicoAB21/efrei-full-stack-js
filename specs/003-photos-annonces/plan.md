# Implementation Plan: Photos des annonces

**Branch**: `003-photos-annonces` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-photos-annonces/spec.md`

## Summary

Chaque annonce gagne un tableau ordonné de 0 à 5 photos (la première = photo principale). Les fichiers
sont reçus en `multipart/form-data` par `multer` (en mémoire, 5 Mo et 5 fichiers maximum), vérifiés sur
leur signature binaire, puis **ré-encodés par `sharp`** en WebP (orientation appliquée, métadonnées
supprimées, 2 tailles : détail 1600 px et carte 480 px) et écrits sur disque sous un nom aléatoire.
Trois routes protégées par propriétaire gèrent l'ajout, l'ordre et la suppression. Le front affiche la
photo principale sur les cartes et une galerie accessible sur les détails.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24

**Primary Dependencies**: + `multer` 2.x (réception multipart, standard Express), + `sharp` 0.35 (décodage,
ré-encodage, suppression des métadonnées ; binaires précompilés, compatible avec le blocage des scripts
d'installation de npm 11)

**Storage**: MongoDB (tableau `photos` dans `listings`) + fichiers sur disque dans `UPLOADS_DIR`
(défaut `backend/uploads/`, ignoré par git ; volume Docker en dev)

**Testing**: Jest + Supertest (`backend/tests/photos.test.ts`) avec des images générées par `sharp` pendant
les tests (dont une photo avec position GPS) et un `UPLOADS_DIR` temporaire

**Target Platform**: identique au MVP

**Project Type**: application web existante

**Performance Goals**: cartes servies en 480 px WebP (~30–60 Ko) pour SC-005 ; `loading="lazy"`

**Constraints**: aucune donnée de carte ni d'utilisateur dans les fichiers ; noms non devinables ;
rien ne doit casser pour une annonce sans photo

**Scale/Scope**: 3 routes, 1 module de traitement d'image, 1 composant galerie, champ photos du formulaire

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|---|---|---|
| I. Stack imposée | Ajout de 2 bibliothèques **sans substitution de brique** ; justifiées dans research §1–2 | ✅ |
| II. Contrat API | Sous `/api/listings/:id/photos`, réponses = l'annonce complète, erreurs au format v1 ; les 5 routes CRUD inchangées | ✅ |
| III. Sécurité / isolation | `requireAuth` ; chaque route filtre `{ _id, ownerId }` → 404 ; signature binaire vérifiée ; SVG refusé ; métadonnées retirées ; noms aléatoires | ✅ |
| IV. Validation serveur | Taille, nombre, format, ids de photo validés côté serveur ; un envoi invalide est refusé en entier | ✅ |
| V. Tests comme preuve | `photos.test.ts` : formats refusés, 5 Mo, 6e photo, GPS absent, isolation A/B, fichiers supprimés ; contre-épreuve sur le filtre `ownerId` | ✅ |
| VI. Simplicité / bonus | Stockage disque (pas de service externe), pas de retouche ni de modération ; critères dans la spec | ✅ |

**Post-design re-check** : ✅ dépendances ajoutées justifiées (Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/003-photos-annonces/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/photos.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/listing.ts            # + photos: [{ id, url, cardUrl, width, height }] (max 5)
│   ├── photos/process.ts            # NOUVEAU : signature binaire → sharp (rotate, resize, webp, sans métadonnées)
│   ├── photos/storage.ts            # NOUVEAU : écriture / suppression dans UPLOADS_DIR, noms randomUUID
│   ├── services/photo.service.ts    # NOUVEAU : add, reorder, remove (filtre ownerId)
│   ├── services/listing.service.ts  # remove() supprime aussi les fichiers
│   ├── controllers/photo.controller.ts
│   ├── routes/listings.ts           # + POST/PATCH/DELETE …/photos (multer seulement sur POST)
│   ├── errors.ts                    # MulterError (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT…) → 400 INVALID_INPUT
│   └── app.ts                       # express.static(UPLOADS_DIR) sur /uploads, en-têtes sûrs
├── openapi.yaml                     # + routes photos, champ photos du schéma Listing
└── tests/photos.test.ts
docker-compose.yml                   # UPLOADS_DIR ; dossier persistant
.gitignore                           # backend/uploads/

frontend/src/
├── components/PhotoPicker.tsx       # NOUVEAU : sélection, aperçus, retrait, ordre (boutons ← →), photo principale
├── components/Gallery.tsx           # NOUVEAU : grande photo + vignettes, flèches clavier
├── components/ListingCard.tsx       # photo principale (cardUrl) sinon pictogramme
├── pages/ListingForm.tsx            # PhotoPicker ; création puis envoi des photos
├── pages/ListingDetail.tsx          # Gallery
├── pages/PublicListing.tsx          # Gallery
└── listings.ts                      # uploadPhotos, reorderPhotos, deletePhoto
```

**Structure Decision**: les photos font partie de l'annonce (tableau imbriqué, ordre = position) ;
le traitement d'image est isolé dans `photos/` pour être testé seul.

**Coordination avec les autres bonus** : `ListingCard` est aussi modifié par 002 (`to` facultatif) ;
`ListingForm` et le schéma d'annonce par 004 (commune). Implémenter dans l'ordre 002 → 003 → 004 → 005 et
rebaser chaque branche sur `main`.

## Complexity Tracking

| Ajout | Pourquoi nécessaire | Alternative plus simple écartée |
|---|---|---|
| `multer` | Express ne lit pas le `multipart/form-data` | Lecture manuelle du flux multipart : long, fragile, risque de faille |
| `sharp` | Supprimer les métadonnées GPS (FR-004) et produire une version carte (SC-005) exige de ré-encoder l'image | Stocker le fichier tel quel : garde la position GPS et des images de 5 Mo sur les cartes |
