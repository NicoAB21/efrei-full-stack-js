# Implementation Plan: Favoris liés au compte

**Branch**: `002-favoris` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-favoris/spec.md`

## Summary

Les favoris passent du navigateur (`localStorage`) à la base : une collection `favorites` (couple
utilisateur/annonce unique), 4 routes protégées sous `/api/favorites` (lister, ajouter, retirer,
importer), et une page « Favoris ». Le front garde `localStorage` pour les visiteurs et l'importe dans
le compte à la connexion. Mêmes règles que le MVP : JWT obligatoire, filtre par propriétaire, 404 sur
ce qui n'est pas à soi.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24 (inchangé)

**Primary Dependencies**: aucune nouvelle (Express 5, Mongoose 8, Zod, React 19, lucide-react)

**Storage**: MongoDB, nouvelle collection `favorites`

**Testing**: Jest + Supertest (`backend/tests/favorites.test.ts`) ; `node --test` côté front pour la fusion
`localStorage` → compte

**Target Platform**: identique au MVP (navigateur desktop/mobile, serveur Node)

**Project Type**: application web existante (`backend/` + `frontend/`)

**Performance Goals**: liste des favoris (≤ 200) en une seule requête

**Constraints**: Contrat API v1 (enveloppe `items`, `id`, format d'erreur) ; routes existantes inchangées

**Scale/Scope**: 1 modèle, 1 service, 4 routes, 1 page, 1 lien d'en-tête, cœur sur le détail public

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|---|---|---|
| I. Stack imposée | Aucune brique nouvelle | ✅ |
| II. Contrat API | Routes sous `/api`, `{ items }`, `id` public, erreurs `{error:{code,message}}`, 204 sans corps | ✅ |
| III. Sécurité / isolation | `requireAuth` sur tout le routeur ; toute requête filtre `userId` ; le favori d'un autre = 404 | ✅ |
| IV. Validation serveur | Zod strict : `listingId` (ObjectId 24 hex), import ≤ 200 ids ; règles métier dans le service | ✅ |
| V. Tests comme preuve | `favorites.test.ts` : nominal, 400, 401, isolation A/B, limite, import ; contre-épreuve sur le filtre `userId` | ✅ |
| VI. Simplicité / bonus | MVP terminé ; pas de compteur public ni de notification ; critères d'acceptation dans la spec | ✅ |

**Post-design re-check** : ✅ aucune violation (voir [research.md](./research.md)).

## Project Structure

### Documentation (this feature)

```text
specs/002-favoris/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── favorites.openapi.yaml   # à fusionner dans backend/openapi.yaml à l'implémentation
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/favorite.ts              # NOUVEAU
│   ├── schemas/favorite.ts             # NOUVEAU : listingId param, corps d'import
│   ├── services/favorite.service.ts    # NOUVEAU : list, add, remove, import
│   ├── services/listing.service.ts     # remove() supprime aussi les favoris de l'annonce
│   ├── controllers/favorite.controller.ts  # NOUVEAU
│   ├── routes/favorites.ts             # NOUVEAU, requireAuth sur tout le routeur
│   └── app.ts                          # monte /api/favorites
├── openapi.yaml                        # + routes favoris
└── tests/favorites.test.ts             # NOUVEAU

frontend/src/
├── favorites.tsx                       # NOUVEAU : FavoritesProvider + useFavorites (serveur si connecté, localStorage sinon)
├── favorites-merge.ts (+ .test.ts)     # NOUVEAU : fusion pure localStorage → ids à importer
├── auth.tsx                            # après login/register : import puis vidage du localStorage
├── App.tsx                             # FavoritesProvider, lien « Favoris », route /favoris
├── pages/Favorites.tsx                 # NOUVEAU
├── pages/Home.tsx                      # remplace son useFavorites local par le contexte
├── pages/PublicListing.tsx             # bouton « Ajouter aux favoris »
└── components/ListingCard.tsx          # `to` facultatif (annonce vendue non cliquable)
```

**Structure Decision**: on suit l'architecture du MVP (routes → contrôleurs → services → modèles) ; le
favori est une ressource à part, liée à l'annonce par `listingId`, sans toucher au modèle `Listing`.

## Complexity Tracking

Aucune violation de la constitution à justifier.
