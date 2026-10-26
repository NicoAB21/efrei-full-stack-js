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

| Service           | URL                              |
| ----------------- | -------------------------------- |
| Front             | http://localhost:5173            |
| Design system     | http://localhost:5173/design     |
| API               | http://localhost:3000/api/health |
| Doc API (Swagger) | http://localhost:3000/api/docs   |
| MongoDB           | mongodb://localhost:27017        |

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
