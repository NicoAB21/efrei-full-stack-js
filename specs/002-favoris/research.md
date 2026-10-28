# Research: Favoris liés au compte

## 1. Modèle : collection à part ou tableau dans l'utilisateur

- **Decision**: collection `favorites` (`userId`, `listingId`, `createdAt`), index unique `{ userId, listingId }`.
- **Rationale**: l'index unique garantit l'absence de doublon (FR-002) même en cas de double clic
  simultané ; tri par date d'ajout naturel ; suppression des favoris d'une annonce en une requête.
- **Alternatives considered**: tableau `favorites[]` dans `users` (doublons à gérer à la main, document
  utilisateur qui grossit, jointure plus pénible).

## 2. Forme des routes

- **Decision**: la ressource est adressée par l'**id de l'annonce**, pas par un id de favori :
  `GET /api/favorites`, `PUT /api/favorites/:listingId`, `DELETE /api/favorites/:listingId`,
  `POST /api/favorites/import`.
- **Rationale**: le front ne connaît que des annonces ; `PUT` est idempotent par nature (ajouter deux fois
  = même résultat, FR-002) ; l'isolation est automatique : B qui supprime `/:listingId` ne touche que son
  propre couple (B, annonce), donc le favori de A est inatteignable (FR-006).
- **Alternatives considered**: `POST /api/favorites` + `DELETE /api/favorites/:favoriteId` (le front devrait
  mémoriser des ids de favoris, et l'ajout ne serait pas idempotent).

## 3. Codes de réponse

- **Decision**: `PUT` → 204 (ajouté ou déjà présent) ; `DELETE` → 204, ou 404 si l'annonce n'est pas dans
  ses favoris ; annonce inexistante ou vendue → 404 ; sa propre annonce ou limite de 200 atteinte → 400
  `INVALID_INPUT` avec un message explicite ; id mal formé → 400.
- **Rationale**: aligné sur le Contrat API v1 (4 codes) et sur la vitrine (une annonce vendue y est déjà
  « introuvable »).
- **Alternatives considered**: 409 pour le doublon (contraire à l'idempotence), 403 pour sa propre
  annonce (code absent du contrat).

## 4. Annonces vendues et supprimées

- **Decision**: `GET /api/favorites` joint les annonces (`$lookup` ou deux requêtes) et ne renvoie que les
  annonces existantes, avec leur `status` ; `listing.service.remove()` supprime aussi les favoris de
  l'annonce (`Favorite.deleteMany({ listingId })`).
- **Rationale**: FR-005 (vendue = affichée « plus disponible », supprimée = disparaît) ; double sécurité :
  même si un favori orphelin restait, la jointure l'écarterait.
- **Alternatives considered**: garder une copie des champs de l'annonce dans le favori (données
  périmées, ex. prix modifié).

## 5. Données renvoyées

- **Decision**: chaque élément = les champs publics de l'annonce (mêmes champs que la vitrine) +
  `favoritedAt`. Jamais l'email du vendeur.
- **Rationale**: la page Favoris réutilise `ListingCard` tel quel ; FR-013.

## 6. Reprise du `localStorage` à la connexion

- **Decision**: après `login`/`register`, le front envoie `POST /api/favorites/import` avec les ids du
  navigateur (≤ 200, dédoublonnés), puis vide `occaz.favorites`. Le serveur ignore silencieusement les ids
  inexistants, vendus, en doublon ou qui sont à l'utilisateur, et renvoie les ids réellement importés.
  Un échec de l'import n'empêche pas la connexion.
- **Rationale**: FR-009 et US4 ; une seule requête au lieu d'un `PUT` par favori.
- **Alternatives considered**: `PUT` en boucle (N requêtes, erreurs partielles à gérer).

## 7. État côté front

- **Decision**: `FavoritesProvider` (contexte React) : si connecté, charge `GET /api/favorites` une fois et
  met à jour l'état de façon optimiste à chaque clic (retour arrière si l'API refuse) ; sinon lit/écrit
  `localStorage` comme aujourd'hui. La page d'accueil, le détail public et la page Favoris utilisent le
  même hook.
- **Rationale**: un seul endroit qui connaît la source des favoris ; cœur réactif sans attendre le serveur.
- **Alternatives considered**: librairie d'état (Redux, Zustand…) : inutile pour un `Set` d'ids
  (constitution VI).

## 8. Cœur sur ses propres annonces

- **Decision**: le front masque le cœur si `listing.ownerId === user.id` ; le serveur refuse quand même
  (400).
- **Rationale**: `ownerId` est déjà public (identifiant opaque) ; la règle reste vérifiée côté serveur.
