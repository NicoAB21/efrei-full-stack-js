# Implementation Plan: Occaz — MVP de petites annonces entre particuliers

**Branch**: `001-marketplace-mvp` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-marketplace-mvp/spec.md`

## Summary

Site de petites annonces façon Leboncoin. MVP évalué : comptes (bcrypt + JWT) et CRUD privé
des annonces `listings` strictement isolé par propriétaire, conforme au Contrat API v1 du livret.
Extensions après MVP testé : vitrine publique en lecture seule (P2) puis messagerie (P3).
Back-end Express 5 + Mongoose en TypeScript, validation stricte Zod, tests Jest/Supertest sur
une MongoDB en mémoire ; front React + Vite en TypeScript, sans librairie d'état ni d'UI.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24 LTS (`.nvmrc`)

**Primary Dependencies**: back : Express 5, Mongoose 8, bcrypt, jsonwebtoken, zod,
swagger-ui-express, yaml ; front : React 19, Vite, react-router

**Storage**: MongoDB 7 (dev : conteneur Docker ; tests : mongodb-memory-server)

**Dev environment**: `docker compose up` lance mongo + backend + frontend avec
rechargement à chaud

**Testing**: Jest + ts-jest + Supertest (back-end) ; pas de tests front dans le MVP

**Target Platform**: navigateur récent (desktop et mobile 375 px) ; serveur Node Linux/WSL

**Project Type**: application web (frontend + backend séparés)

**Performance Goals**: aucun objectif chiffré ; usage démo (quelques dizaines d'annonces)

**Constraints**: Contrat API v1 du livret (routes, formats, codes HTTP) ; aucun secret versionné ;
accessible au clavier ; app Express importable sans écouter de port

**Scale/Scope**: ~10 routes API, ~6 écrans (inscription, connexion, mes annonces, formulaire,
détail, vitrine)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|---|---|---|
| I. Stack imposée TS | React+Vite / Express / MongoDB+Mongoose / bcrypt+JWT / ESLint / Jest+Supertest / Swagger, en TS ; `frontend/` et `backend/` indépendants | ✅ |
| II. Contrat API strict | Routes `/api/health`, `/api/auth/*`, 5 routes `/api/listings` ; enveloppe `items` ; `id` sans `_id` ; format d'erreur et 4 codes (cf. [contracts/openapi.yaml](./contracts/openapi.yaml)) | ✅ |
| III. Sécurité / isolation | Middleware Bearer sur `/api/listings` ; toutes les requêtes Mongoose filtrent `{ _id, ownerId }` → 404 ; `toJSON` retire `passwordHash` ; `JWT_SECRET` en env | ✅ |
| IV. Validation serveur | Schémas Zod `.strict()` ; PATCH partiel non vide ; id validé par regex 24 hex → 400 avant toute requête | ✅ |
| V. Tests comme preuve | Suite Supertest : CRUD nominal, 400, 401, 404 A/B ; `createApp()` sans `listen` ; base mémoire vidée entre tests | ✅ |
| VI. Simplicité | routes → contrôleurs → services → modèles ; P2/P3 seulement après MVP testé ; dépendances justifiées dans [research.md](./research.md) | ✅ |

**Post-design re-check (après Phase 1)** : ✅ aucune violation. Les routes publiques P2
(`/api/public/listings`) et la messagerie P3 sont des routes supplémentaires qui ne modifient
pas les 5 routes du contrat (FR-016).

## Project Structure

### Documentation (this feature)

```text
specs/001-marketplace-mvp/
├── plan.md              # Ce fichier
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── openapi.yaml     # Phase 1 — contrat HTTP, servi par Swagger UI
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
docker-compose.yml           # mongo + backend + frontend (dev)
README.md

backend/
├── Dockerfile               # image de dev Node 24
├── package.json             # dev, build, start, lint, test
├── tsconfig.json
├── eslint.config.js
├── jest.config.js
├── .env.example             # PORT, MONGODB_URI, JWT_SECRET (valeurs fictives)
├── openapi.yaml             # copie de contracts/openapi.yaml, servie sur /api/docs
├── src/
│   ├── app.ts               # createApp() : middlewares, routes, 404, gestion d'erreurs
│   ├── server.ts            # connexion Mongo + listen(PORT)
│   ├── errors.ts            # HttpError + middleware d'erreur → {error:{code,message}}
│   ├── middleware/auth.ts   # Bearer JWT → req.userId, sinon 401
│   ├── models/              # user.ts, listing.ts (message.ts en P3)
│   ├── schemas/             # schémas Zod : auth.ts, listing.ts
│   ├── services/            # auth.service.ts, listing.service.ts
│   ├── controllers/         # auth.controller.ts, listing.controller.ts
│   └── routes/              # auth.ts, listings.ts (public.ts en P2)
└── tests/
    ├── setup.ts             # mongodb-memory-server + nettoyage entre tests
    ├── auth.test.ts
    ├── listings.test.ts     # CRUD, 400, 401
    └── isolation.test.ts    # A/B → 404
frontend/
├── Dockerfile               # image de dev Node 24
├── package.json             # dev, build, preview, lint
├── vite.config.ts           # proxy /api → API_PROXY_TARGET
├── eslint.config.js
└── src/
    ├── main.tsx, App.tsx    # routes React Router
    ├── api.ts               # fetch + Bearer + gestion 401
    ├── auth.tsx             # contexte de session (token en localStorage)
    ├── price.ts             # centimes ↔ euros
    ├── pages/               # Login, Register, MyListings, ListingForm, ListingDetail (Home en P2)
    └── index.css
```

**Structure Decision**: application web en deux projets npm indépendants `backend/` et
`frontend/`, imposée par la constitution (I). Pas de workspace racine ni de package partagé :
les quelques types partagés (catégories, statuts) sont dupliqués côté front, ce qui reste plus
simple qu'un troisième package.

## Complexity Tracking

Aucune violation de la constitution à justifier.
