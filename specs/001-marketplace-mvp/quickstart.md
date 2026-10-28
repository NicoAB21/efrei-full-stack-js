# Quickstart: valider Occaz de bout en bout

Guide de validation, pas d'implémentation. Contrat de référence :
[contracts/openapi.yaml](./contracts/openapi.yaml) ; règles des champs :
[data-model.md](./data-model.md).

## Prérequis

- Node.js 24 (`nvm use`), npm 11
- Docker (pour MongoDB de dev)

## Installation et lancement

Tout en Docker (recommandé) :

```bash
docker compose up --build                 # mongo :27017, API :3000, front :5173
```

Ou en local, projet par projet :

```bash
docker compose up -d mongo
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev  # autre terminal ; proxy /api → :3000
```

Swagger UI : http://localhost:3000/api/docs

## Vérifications automatiques

```bash
cd backend && npm run lint && npm run build && npm test
cd frontend && npm run lint && npm run build
```

Attendu : tout passe ; la suite couvre CRUD nominal, 400, 401 et isolation A/B → 404
(principe V). Contre-épreuve : retirer `ownerId` d'un filtre dans `listing.service.ts`
DOIT faire échouer `isolation.test.ts`.

## Scénarios API (curl)

```bash
API=http://localhost:3000/api
curl -s $API/health                                            # 200 {"status":"ok"}

TOKEN_A=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"Alice@Example.test","password":"motdepasse"}' | jq -r .token)   # 201
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.test","password":"motdepasse"}'                   # 409

ID=$(curl -s -X POST $API/listings -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Vélo de ville","priceCents":8500,"category":"loisirs","cityCode":"69123","postalCode":"69001"}' \
  | jq -r .id)                                                                  # 201

curl -s -X PATCH $API/listings/$ID -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"priceCents":7000}'                 # 200, seul le prix change
```

| Requête | Attendu |
|---|---|
| `GET /listings` sans header | 401 `UNAUTHORIZED` |
| `GET /listings/abc` | 400 `INVALID_INPUT` |
| `POST /listings` avec `"priceCents":0`, `-5`, `12.5` ou `"title":"   "` | 400 |
| `POST /listings` avec `"ownerId"` ou `"id"` | 400 |
| `PATCH /listings/:id` avec `{}` ou `{"foo":1}` | 400 |
| B : `GET/PATCH/DELETE /listings/<id de A>` | 404 `NOT_FOUND`, identique à un id inexistant |
| `DELETE /listings/:id` (propriétaire) | 204 sans corps, puis `GET` → 404 |
| Aucune réponse | ne contient `_id`, `password` ni `passwordHash` |

Persistance (SC-004) : arrêter `npm run dev`, relancer, `GET /listings` avec `TOKEN_A`
renvoie toujours l'annonce.

## Scénarios navigateur

1. Inscription → connexion automatique → « Mes annonces » vide avec invitation à publier.
2. Publier « Vélo de ville », 85,00 €, Loisirs, Lyon → affiché `85,00 €` (SC-001 < 2 min).
3. Modifier le prix, marquer « vendue », supprimer avec confirmation.
4. Erreurs : mot de passe de 7 caractères, titre vide → message lisible près du champ.
5. Second compte B : sa liste ne montre pas l'annonce de A ; URL directe vers l'annonce de A
   → « introuvable ».
6. Session expirée ou token effacé → retour à la connexion avec message.
7. Mode responsive 375 px + navigation au clavier seul : tout le parcours reste faisable,
   focus visible (SC-006).
8. **P2** : déconnecté, l'accueil liste les annonces disponibles (pas les vendues), filtres
   catégorie / ville / mot-clé / prix ; le détail n'affiche aucun email.
9. **P3** : B écrit sur l'annonce de A ; A voit le message ; pas de bouton « Contacter » sur
   ses propres annonces.
