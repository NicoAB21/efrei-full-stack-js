# Occaz

Site de petites annonces entre particuliers (principe Leboncoin) : module EFREI « Full Stack JS ».

- `frontend/` : React + Vite + TypeScript
- `backend/` : Node.js + Express 5 + Mongoose + TypeScript
- `specs/001-marketplace-mvp/` : spec, plan, contrat API et **tâches** (spec-kit)

## Prérequis

- Node.js 24 (`nvm use` lit `.nvmrc`)
- Docker

## Lancer tout le projet (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Front | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| MongoDB | mongodb://localhost:27017 |

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

| Dossier | Commande | Rôle |
|---|---|---|
| `backend/` | `npm run dev` | API avec rechargement (tsx) |
| `backend/` | `npm run lint` | ESLint |
| `backend/` | `npm run build` | compile vers `dist/` |
| `backend/` | `npm test` | Jest + Supertest |
| `frontend/` | `npm run dev` | serveur Vite |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run build` | build de production |

## Variables d'environnement (`backend/.env`)

| Variable | Exemple | Rôle |
|---|---|---|
| `PORT` | `3000` | port de l'API |
| `MONGODB_URI` | `mongodb://localhost:27017/occaz` | base MongoDB |
| `JWT_SECRET` | `change-me-dev-only` | clé de signature des JWT (jamais versionnée) |

## Travailler à plusieurs

1. Choisir une tâche non cochée dans [`specs/001-marketplace-mvp/tasks.md`](specs/001-marketplace-mvp/tasks.md)
   (respecter l'ordre des phases).
2. Créer une branche `feat/T0xx-description` depuis `main`.
3. Avant la PR : `npm run lint && npm run build && npm test` dans le dossier modifié.
4. Cocher la tâche dans `tasks.md` dans la même PR.

Le contrat d'API de référence est [`specs/001-marketplace-mvp/contracts/openapi.yaml`](specs/001-marketplace-mvp/contracts/openapi.yaml).
