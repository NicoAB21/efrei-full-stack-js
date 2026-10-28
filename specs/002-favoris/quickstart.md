# Quickstart: valider les favoris

Contrat : [contracts/favorites.openapi.yaml](./contracts/favorites.openapi.yaml) · règles :
[data-model.md](./data-model.md).

## Automatique

```bash
cd backend && npm run lint && npm run build && npm test     # dont tests/favorites.test.ts
cd frontend && npm run lint && npm run build && npm test    # dont favorites-merge.test.ts
```

`favorites.test.ts` doit couvrir : ajout 204 et idempotence, liste triée, annonce vendue gardée avec
`status: "sold"`, annonce supprimée absente, sa propre annonce → 400, annonce vendue/inexistante → 404,
id mal formé → 400, 201e favori → 400, import (doublons, vendues, siennes ignorées), sans token → 401,
**isolation A/B** (B ne voit pas et ne retire pas les favoris de A).

Contre-épreuve : retirer le filtre `userId` de `favorite.service.ts` DOIT faire échouer le test
d'isolation.

## API (curl, comptes A vendeur et B acheteur)

| Requête | Attendu |
|---|---|
| B `PUT /api/favorites/<annonce de A>` | 204, deux fois de suite : toujours 204, 1 seul favori |
| B `GET /api/favorites` | 200, `items[0].id` = annonce de A, `favoritedAt` présent, pas d'email |
| A `PUT /api/favorites/<sa propre annonce>` | 400 |
| A marque son annonce vendue, puis B `GET` | l'annonce est là avec `status: "sold"` |
| A supprime son annonce, puis B `GET` | l'annonce a disparu |
| A `DELETE /api/favorites/<annonce dans les favoris de B>` | 404, le favori de B est intact |
| sans token `GET /api/favorites` | 401 |

## Navigateur

1. Déconnecté : cliquer sur 2 cœurs de la vitrine, ouvrir « Favoris » : les 2 annonces + invitation à se
   connecter.
2. Se connecter : les 2 favoris sont dans le compte ; `localStorage["occaz.favorites"]` est vide.
3. Ouvrir le site dans un autre navigateur, se connecter : mêmes favoris, cœurs pleins.
4. Sur le détail public : bouton « Ajouter aux favoris » / « Retirer des favoris ».
5. Sur ses propres annonces : aucun cœur.
6. Clavier seul à 375 px : ajouter et retirer un favori, ouvrir la page Favoris.
