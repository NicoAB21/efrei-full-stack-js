# Occaz — guide de l'oral

Ce guide suit les 5 parties de l'oral (10 minutes, voir `ORAL DevFullStack.pdf`). Pour chaque partie : qui parle, combien de temps, le message à faire passer, puis tout ce que l'orateur doit savoir à ce moment-là. La **réserve** à la fin détaille le code pour répondre aux questions du jury.

La répartition des orateurs est une proposition : adaptez-la, mais **chacun doit parler**.

## Sommaire

1. [Présentation du projet](#1-présentation-du-projet--1-min) — 1 min
2. [Architecture et choix techniques](#2-architecture-et-choix-techniques--2-min) — 2 min
3. [Démonstration](#3-démonstration--4-min) — 4 min
4. [Retour sur le développement](#4-retour-sur-le-développement--2-min) — 2 min
5. [Bilan et perspectives](#5-bilan-et-perspectives--1-min) — 1 min
6. [Réserve : questions du jury](#6-réserve--questions-du-jury)
7. [Correspondance avec le barème](#7-correspondance-avec-le-barème)
8. [Glossaire](#8-glossaire)

---

## 1. Présentation du projet — 1 min

**Orateur proposé** : Nicolas.
**Message** : Occaz, c'est leboncoin en version école : publier, trouver, échanger et acheter entre particuliers.

### Le concept et le besoin

- **Le concept** : une place de marché d'objets d'occasion entre particuliers.
- **Le besoin** : vendre ce qui dort chez soi, trouver une bonne affaire près de chez soi, et le faire en sécurité.

### Les fonctionnalités principales

| Socle demandé (MVP) | Bonus réalisés |
|---|---|
| Inscription et connexion (JWT) | Recherche avancée : filtres, tri, pagination |
| Mes annonces : créer, lire, modifier, supprimer | Favoris liés au compte |
| Isolation : personne ne touche aux annonces d'un autre | Photos (0 à 5 par annonce) |
| Vitrine publique des annonces disponibles | Communes officielles avec code postal |
| | Paiement en ligne Stripe (mode test) |
| | Messagerie privée acheteur ↔ vendeur |

---

## 2. Architecture et choix techniques — 2 min

**Orateur proposé** : Nicolas pour le back, Kelyan pour le front.
**Message** : une architecture en couches, un contrat d'API strict, et des choix justifiés là où le livret laissait libre.

### 2.1 Le schéma à montrer

```
Navigateur (React)
      │  /api/...  /uploads/...
      ▼
Vite :5173 ── proxy ──► API Express :3000 ──► MongoDB :27017
                              │      ▲
                              │      └── webhooks signés ◄── relais stripe-cli ◄── Stripe
                              └──► dossier uploads/ (photos WebP)
```

- **Le navigateur ne parle qu'à Vite**, qui relaie `/api` et `/uploads` vers l'API. Tout part de la même origine, donc il n'y a pas de CORS à configurer.
- **Seule l'API parle à MongoDB et à Stripe.**

### 2.2 Organisation du back-end (Node.js / Express)

**Une requête traverse 4 couches** (c'est ce que le livret demande) :

| Couche | Dossier | Rôle |
|---|---|---|
| Route | `routes/` | associe une URL à une fonction, ajoute `requireAuth` si besoin |
| Contrôleur | `controllers/` | lit la requête, la valide avec Zod, choisit le code HTTP |
| Service | `services/` | règles métier, toujours filtrées par l'utilisateur connecté |
| Modèle | `models/` | schéma Mongoose et index |

- **`errors.ts`** : toute erreur, d'où qu'elle vienne, sort au format `{"error":{"code","message"}}`.
- **`app.ts` construit l'application sans ouvrir de port** : `server.ts` l'écoute, les tests l'importent directement.
- **Swagger** sur http://localhost:3000/api/docs : 27 routes documentées (méthode + URL), et un test vérifie qu'elles existent toutes.

### 2.3 Organisation du front-end (React)

| Dossier ou fichier | Rôle |
|---|---|
| `pages/` | une page par route (accueil, recherche, annonce, mes annonces, favoris, messages, achats…) |
| `components/` | briques réutilisées (carte d'annonce, galerie, champ commune…) |
| `design-system/` | `tokens.css` (couleurs, typo, espacements), `components.css` |
| `api.ts` | **seul point d'appel réseau** : ajoute le jeton, transforme les erreurs, gère la session expirée |
| `auth.tsx`, `favorites.tsx`, `unread.tsx` | trois contextes React : session, favoris, messages non lus |

- **L'état des filtres de recherche vit dans l'URL** (`/recherche?q=vélo&category=loisirs`) : une recherche se partage, survit au rechargement et suit le bouton retour.

### 2.4 La base MongoDB

| Collection | Contenu | Relation |
|---|---|---|
| `users` | email (unique), mot de passe haché | — |
| `listings` | annonce : titre, prix en centimes, catégorie, commune, statut, photos | `ownerId` → users |
| `favorites` | un favori | users ↔ listings (plusieurs à plusieurs) |
| `purchases` | un achat, prix figé au clic | `buyerId` → users, `listingId` → listings |
| `conversations` | une discussion par acheteur et par annonce | acheteur, vendeur, annonce |
| `messages` | un message | `conversationId` → conversations |

- **Les photos sont imbriquées dans l'annonce** : on les lit toujours avec elle, 5 au maximum.
- **Les favoris, achats et messages sont des collections à part** : ils relient deux documents, et leur nombre n'est pas borné.
- **Les index servent les requêtes réelles**, et les index uniques font respecter des règles : un email par compte, un favori par annonce, une conversation par acheteur et par annonce.

### 2.5 L'authentification JWT, en 4 étapes

1. **Inscription** : le mot de passe est haché avec **bcrypt** (coût 10), on ne le stocke jamais en clair. Un email déjà pris donne un 409.
2. **Connexion** : bcrypt compare le mot de passe, puis le serveur renvoie un **JWT signé** (HS256, `JWT_SECRET`, valable 2 h) contenant l'id de l'utilisateur.
3. **Le front** garde le jeton et l'envoie à chaque appel : `Authorization: Bearer <jwt>`.
4. **Le middleware `requireAuth`** vérifie la signature et l'expiration, puis pose `req.userId`. Sinon il répond 401.

**Être connecté ne suffit pas** : chaque requête filtre aussi sur le propriétaire (`{ _id, ownerId }`). L'annonce d'un autre donne un **404**, pas un 403, pour ne pas révéler qu'elle existe.

### 2.6 Les choix non imposés, et pourquoi

Le livret impose React, Express, MongoDB + Mongoose, bcrypt + JWT, ESLint, Jest + Supertest et Swagger. **Tout le reste est un choix de notre part** :

| Choix | Pourquoi |
|---|---|
| **TypeScript** (le livret dit JavaScript) | Il est compilé en JavaScript : même runtime, mêmes librairies, aucune brique remplacée. Les erreurs de type sont trouvées à la compilation, pas en démo. Les types documentent le code entre nous trois. |
| **Zod** (validation) | Le contrat exige un 400 pour un champ inconnu ou un type faux. Mongoose valide trop tard (à l'écriture) et ignore les champs inconnus ; Zod refuse la requête dès l'entrée. Un même schéma donne aussi le type TypeScript. |
| **Docker Compose** | Une commande (`docker compose up`) lance les 4 services : MongoDB, API, front, relais Stripe. Tout le monde a le même environnement, sans rien installer à part Docker. |
| **Vite** (conseillé, pas imposé) | Démarrage instantané, rechargement à chaud, et un proxy intégré qui évite le CORS. |
| **React Router** | Navigation entre les pages sans recharger, et routes protégées (`RequireAuth`). |
| **multer + sharp** (photos) | multer reçoit les fichiers ; sharp les ré-encode en WebP et retire les métadonnées, dont la position GPS. |
| **Stripe Checkout** (paiement) | L'acheteur paie sur la page de Stripe : aucune donnée de carte ne passe par chez nous. Mode test uniquement. |
| **mongodb-memory-server** (tests) | Une vraie base MongoDB en mémoire pour chaque fichier de test : on teste les vrais index et les vraies opérations atomiques, pas des imitations. |
| **tsx** | Lance le TypeScript directement en développement, avec rechargement à chaud. |
| **swagger-ui-express + yaml** | Servent le Swagger demandé à partir du fichier `openapi.yaml`. |
| **lucide-react** | Bibliothèque d'icônes libre, cohérente et accessible. |
| **Référentiel des communes en fichier local** | Les 34 964 communes de l'État sont chargées en mémoire : suggestions instantanées et validation sans dépendre d'un service externe. |
| **spec-kit** (méthode) | Une spec, un plan et des tâches par fonctionnalité dans `specs/` : on savait quoi faire et qui le faisait. |
| **Prix en centimes entiers** | `0.1 + 0.2 !== 0.3` en JavaScript ; un entier est exact. |

---

## 3. Démonstration — 4 min

**Orateurs proposés** : Kelyan (parcours acheteur), Ismael (parcours vendeur et messagerie), Nicolas (paiement).
**Message** : un parcours cohérent, avec à chaque étape **comment c'est fait**, comme le demande l'oral (« ne vous contentez pas de montrer les interfaces »).

### 3.1 Préparation, avant d'entrer

- [ ] `docker compose up --build -V` : les 4 services sont `Up` (`docker compose ps`).
- [ ] `docker compose exec backend npm run seed` pour repartir de données propres. Comptes : `alice`, `bruno`, `chloe`, `david`, `emma` `@occaz.test`, mot de passe `motdepasse`.
- [ ] Navigateur 1 connecté en **emma** (acheteuse). Navigateur 2, en navigation privée, en **bruno** (vendeur).
- [ ] Onglets prêts : le site (http://localhost:5173) et Swagger (http://localhost:3000/api/docs).
- [ ] Une photo sur le bureau pour l'ajout d'images.

### 3.2 Le parcours, étape par étape

| # | On montre | On explique |
|---|---|---|
| 1 | **Inscription** d'un nouveau compte, puis déconnexion et **connexion** | mot de passe haché avec bcrypt ; le serveur renvoie un JWT de 2 h, que le front envoie ensuite dans chaque requête |
| 2 | **Recherche** depuis l'en-tête (« vélo »), puis les filtres : catégorie, commune, prix, tri | les filtres sont dans l'URL ; le serveur filtre, trie et pagine par 50 ; le texte cherché est échappé avant de devenir une regex |
| 3 | **Page d'une annonce** : galerie, vendeur, annonces similaires | les annonces vendues n'apparaissent jamais dans la vitrine ; c'est le serveur qui décide si l'annonce peut être achetée en ligne |
| 4 | **Favori** (le cœur), puis la page Favoris | ajout idempotent (deux clics = un seul favori, garanti par un index unique) ; le cœur change tout de suite et revient en arrière si l'API refuse |
| 5 | Fenêtre de Bruno : **créer une annonce** avec commune et photos, puis la **modifier** et la **supprimer** (le CRUD) | la commune est vérifiée contre le référentiel officiel ; les photos sont vérifiées sur leurs octets, ré-encodées en WebP, GPS retiré ; un SVG est refusé |
| 6 | **Isolation** : Emma tente de supprimer l'annonce de Bruno depuis le terminal (commande en 6.6) | réponse 404 : chaque requête filtre sur le propriétaire |
| 7 | **Messagerie** : Emma écrit à Bruno depuis l'annonce, Bruno voit la **pastille rouge**, répond, Emma voit « Vu » | une conversation par acheteur et par annonce ; les non-lus sont comptés côté serveur ; seuls les deux participants y ont accès |
| 8 | **Achat** : Emma achète avec la carte de test `4242 4242 4242 4242`, voit la confirmation ; chez Bruno, l'annonce est « vendue en ligne » | le prix est lu en base ; seul le webhook signé de Stripe valide la vente ; une mise à jour atomique garantit une seule vente |
| 9 | **Swagger**, et `npm test` si le temps le permet | les routes documentées sont vérifiées par un test ; 254 tests back-end sur une vraie base |

**Carte refusée** (si on veut le montrer) : `4000 0000 0000 0002`. Date future, CVC au choix.

### 3.3 Si quelque chose casse

| Symptôme | Correction |
|---|---|
| Plus aucune annonce, erreur de chargement | `docker compose logs backend`, puis `docker compose up -d --build -V` |
| Pas de bouton « Acheter » | la clé Stripe manque dans `backend/.env` |
| Paiement « en cours de confirmation » qui ne finit pas | `docker compose logs stripe`, puis redémarrer le service `stripe` |
| Données abîmées par une répétition | `docker compose exec backend npm run seed` |
| Pas de réseau dans la salle | montrer le test `stripe-webhook.test.ts`, qui tourne sans réseau |

---

## 4. Retour sur le développement — 2 min

**Orateur proposé** : Ismael, puis chacun cite sa difficulté.
**Message** : on s'est organisés par fonctionnalités avec un contrat commun, on a rencontré de vrais problèmes, et on les a résolus.

### 4.1 Organisation et répartition

- **Méthode spec-kit** : pour chaque fonctionnalité, une spec, un plan et une liste de tâches dans `specs/` (001 MVP, puis 002 à 005 pour les bonus).
- **Une constitution** (`.specify/memory/constitution.md`) fixe les règles communes : stack, contrat API, sécurité, tests obligatoires.
- **Le contrat API a été fixé avant le code** : routes, formats et codes d'erreur. Front et back ont pu avancer en parallèle.
- **Une branche par tâche**, fusionnée dans `main` par pull request.
- **Répartition** (`specs/001-marketplace-mvp/tasks.md`) :

| Qui | Parties |
|---|---|
| Nicolas | mise en place et socle (dont l'intégration du design system), isolation (US3), finitions, bonus (photos, communes, paiement) |
| Kelyan | comptes (US1), vitrine publique (US4) |
| Ismael | mes annonces (US2), messagerie (US5), charte graphique |

### 4.2 Difficultés concrètes et leur résolution

Le barème en demande au moins une. À choisir selon l'orateur :

| Problème | Cause | Solution |
|---|---|---|
| **Deux acheteurs pouvaient payer le même objet** | lire « disponible » puis écrire « vendu » en deux temps laisse une fenêtre entre les deux | une seule mise à jour atomique conditionnée par `status: 'available'` ; le second paiement est remboursé ; test avec deux paiements simultanés |
| **Signature Stripe toujours invalide** | `express.json()` avait déjà transformé le corps, alors que la signature porte sur les octets bruts | monter la route du webhook avant `express.json()`, avec `express.raw()` |
| **L'API Docker plantait après un `git pull`** (« Cannot find package ») | `node_modules` est un volume Docker qui gardait les anciens modules | relancer avec `docker compose up --build -V` ; documenté dans le README |
| **Tests qui échouaient au hasard** | la base de test démarrait en plus de 10 s, puis deux tests tiraient le même port | délai de 60 s, moins de tests en parallèle, nouvelle tentative sur un autre port |
| **Recherche « vélo » + « Lyon » qui renvoyait trop de résultats** | deux conditions « OU » de Mongoose fusionnées en une seule | les combiner avec `.and([{ $or }])`, et un test qui le prouve |
| **Suggestions de communes peu pertinentes** (« Lyoffans » avant Lyon) | tri alphabétique | trier par nom exact, puis par population |
| **Code postal refusé pour Saint-Denis (Réunion)** | 97411 est le code INSEE de la commune, pas son code postal (97400) | séparer partout `cityCode` (INSEE) et `postalCode` |

### 4.3 Choix et compromis assumés

- **Pas de temps réel** : la messagerie relit les messages toutes les 5 s au lieu d'utiliser des WebSockets. C'est plus simple, et suffisant pour une démo.
- **Photos stockées sur le disque du serveur**, plutôt que sur un stockage objet.
- **Paiement en mode test** : le vendeur ne reçoit pas l'argent, il faudrait Stripe Connect pour ça.
- **Jeton dans `localStorage`** plutôt qu'en cookie : plus simple, mais lisible par un script injecté.
- **Pas de pseudo à l'inscription** : les membres apparaissent comme « Membre XXXX » dans la messagerie, sans jamais révéler leur email.

---

## 5. Bilan et perspectives — 1 min

**Orateur proposé** : Kelyan.
**Message** : tout ce qui était demandé fonctionne ; voici honnêtement ce qui manque, ce qu'on ferait ensuite et ce qu'on a appris.

- **Terminé** : comptes, CRUD des annonces, isolation, vitrine, et les 6 bonus (recherche avancée, favoris, photos, communes, paiement, messagerie). 254 tests back-end, Swagger, Docker.
- **Incomplet ou manquant** :
  - pas de notification par email ;
  - pas de temps réel dans la messagerie ;
  - pas de blocage ni de signalement d'un membre ;
  - pas de pseudo ;
  - pas d'image Docker de production ni d'intégration continue.
- **Avec plus de temps** :
  - WebSockets pour la messagerie ;
  - stockage objet pour les photos ;
  - Stripe Connect pour payer réellement le vendeur ;
  - GitHub Actions (lint et tests à chaque push).
- **Ce qu'on a appris** :
  - découper une API en couches ;
  - sécuriser une API (isolation, validation, signatures) ;
  - tester sur une vraie base ;
  - gérer la concurrence avec des opérations atomiques ;
  - travailler à trois sur un même dépôt grâce à un contrat d'API.

---

## 6. Réserve : questions du jury

Ces fiches servent quand le jury demande « montrez-moi dans le code » ou « comment ça marche exactement ».

### 6.1 Le chemin complet d'une requête : publier une annonce

1. **Front** : `ListingForm` valide les champs, puis appelle `createListing()` (`frontend/src/listings.ts`).
2. **Front** : `apiFetch` ajoute `Authorization: Bearer <jwt>` et envoie `POST /api/listings`.
3. **Vite** relaie la requête vers l'API.
4. **API** : `express.json()` lit le corps.
5. **Route** : `requireAuth` vérifie le jeton et pose `req.userId`.
6. **Contrôleur** : `listingCreateSchema.parse(req.body)` ; un champ inconnu ou invalide donne 400.
7. **Service** : vérifie la commune, écrit le nom officiel, puis `Listing.create({ ..., ownerId })`.
8. **Réponse 201** : `toJSON` remplace `_id` par `id`.
9. **Erreur** à n'importe quelle étape : elle remonte à `errorHandler`, qui répond au format du contrat.

### 6.2 `requireAuth` ligne par ligne (`backend/src/middleware/auth.ts`)

```ts
const [scheme, token] = req.headers.authorization?.split(' ') ?? []
if (scheme !== 'Bearer' || !token) throw unauthorized()               // pas d'en-tête → 401
const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) // signature + expiration
if (typeof payload === 'string' || !payload.sub) throw unauthorized()
req.userId = payload.sub                                              // l'identité vient du jeton
next()
```

- **`algorithms: ['HS256']`** : un jeton qui annoncerait un autre algorithme, ou « none », est refusé.
- **À la connexion**, si l'email n'existe pas, on compare quand même avec un faux hash (`DUMMY_PASSWORD_HASH`). Le temps de réponse est le même, et on ne peut pas deviner les emails inscrits en chronométrant.
- **Le message d'erreur est neutre** : « Email ou mot de passe incorrect » dans tous les cas.

### 6.3 Les erreurs (`backend/src/errors.ts`)

- **`HttpError(status, code, message)`** se lève depuis n'importe quelle couche.
- **Express 5** fait remonter seules les erreurs des fonctions `async` jusqu'au middleware d'erreur, sans `try/catch`.
- **`errorHandler`** traduit chaque type d'erreur :

| Erreur | Réponse |
|---|---|
| `ZodError` | 400 `INVALID_INPUT`, avec le nom du champ |
| `MulterError` (fichier trop gros…) | 400 |
| JSON mal formé | 400 |
| `HttpError` | son propre statut |
| tout le reste | 500 `INTERNAL_ERROR`, **sans aucun détail interne** |

### 6.4 La validation Zod (`backend/src/schemas/`)

- **`z.strictObject`** : un champ inconnu donne 400. C'est ce qui empêche d'envoyer un `ownerId` à la place du serveur.
- **`objectIdParam`** : 24 caractères hexadécimaux exactement. Un id mal formé donne 400.
- **`.trim().min(1)`** : un titre fait seulement d'espaces est refusé.
- **`z.coerce.number()`** : convertit en nombre les paramètres d'URL, qui arrivent en texte.
- **`.refine(...)`** : règle sur plusieurs champs, par exemple « prix minimum ≤ prix maximum ».
- **`z.infer`** : le type TypeScript est déduit du schéma, donc validation et type ne peuvent pas diverger.

### 6.5 Le contrat API

| Règle | Comment |
|---|---|
| Une seule forme d'erreur | `{"error":{"code","message"}}` |
| Codes d'erreur | 400 `INVALID_INPUT`, 401 `UNAUTHORIZED`, 404 `NOT_FOUND`, 409 `EMAIL_ALREADY_USED`, 502 `PAYMENT_UNAVAILABLE` |
| Identifiant public | `id` en chaîne ; jamais `_id`, `__v` ni `passwordHash` (`toJSONOptions`, dans `schemas/common.ts`) |
| Listes | `{ "items": [...] }` |

### 6.6 L'isolation, à montrer en direct

```bash
TOKEN=$(curl -s localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"emma@occaz.test","password":"motdepasse"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -i -X DELETE localhost:3000/api/listings/ID_D_UNE_ANNONCE_DE_BRUNO -H "Authorization: Bearer $TOKEN"
# → 404 {"error":{"code":"NOT_FOUND",...}} et l'annonce est toujours là
```

**Le code responsable** : `Listing.findOneAndDelete({ _id: id, ownerId })`. Le filtre ne trouve rien, donc le service répond 404.

### 6.7 La recherche (`listPublic`, dans `listing.service.ts`)

- **Base** : `Listing.find({ status: 'available' }).select(publicFields)`. Jamais d'annonce vendue, et seulement les champs publics.
- **Mot-clé** : cherché dans le titre OU la description, sans tenir compte de la casse. Le texte est **échappé** avant de devenir une regex.
- **Deux conditions « OU »** (ville et mot-clé) sont combinées avec `.and([{ $or }])`.
- **Tri** : on ajoute toujours `_id` pour départager les égalités, sinon l'ordre change d'une page à l'autre.
- **Page de 50 résultats**, et `total` calculé en parallèle (`Promise.all` avec `countDocuments`).

### 6.8 Les photos (`backend/src/photos/`, `photo.service.ts`)

1. **multer** garde les fichiers en mémoire : 5 Mo et 5 fichiers maximum.
2. **`detectFormat`** lit les premiers octets du fichier :
   - JPEG : `FF D8 FF` ;
   - PNG : `89 50 4E 47…` ;
   - WebP : `RIFF….WEBP`.

   L'extension et le type annoncés sont falsifiables, les octets non.
3. **sharp** :
   - applique l'orientation (`.rotate()`) ;
   - crée deux tailles en WebP (1600 et 480 px) ;
   - ne recopie pas les métadonnées (position GPS, appareil, date) ;
   - refuse les images de plus de 40 millions de pixels, qui pourraient saturer la mémoire.
4. **Nom aléatoire** (`randomUUID`), servi sur `/uploads` avec `nosniff`.
5. **Tout ou rien** : toutes les photos sont traitées avant d'écrire le moindre fichier. En cas d'échec, les fichiers déjà écrits sont supprimés.

### 6.9 Les communes (`backend/src/communes/index.ts`)

- **`normalize`** met en minuscules, retire les accents et remplace les tirets : « Saint-Étienne » devient « saint etienne ».
- **Les noms sont triés** : une **recherche dichotomique** trouve vite le premier nom qui commence par le texte tapé.
- **Suggestions** : nom exact d'abord, puis la commune la plus peuplée, 20 au maximum.
- **`checkLocation`** vérifie que le code postal appartient bien à la commune. Sinon : 400.

### 6.10 Les favoris (`favorite.service.ts`)

- **Idempotent** : si deux clics arrivent en même temps, l'index unique refuse le doublon (erreur `11000`), et on l'ignore.
- **Règles** : impossible de mettre sa propre annonce en favori ; 200 favoris maximum.
- **Visiteur non connecté** : ses favoris sont gardés dans le navigateur, puis importés dans son compte à la connexion.

### 6.11 Le paiement Stripe (`purchase.service.ts`, `routes/stripe-webhook.ts`)

1. **`POST /api/purchases`** : on vérifie l'annonce (disponible, pas la sienne, hors Immobilier et Véhicules, 10 000 € maximum), on **lit le prix en base** et on crée un achat `pending`.
2. **L'acheteur paie sur la page de Stripe.**
3. **Le webhook** est monté **avant `express.json()`** : la signature porte sur le corps brut, et elle est vérifiée avec `STRIPE_WEBHOOK_SECRET`. Une signature fausse donne 400, sans aucun effet.
4. **La vente, en une opération atomique** :

   ```ts
   const sold = await Listing.findOneAndUpdate(
     { _id: purchase.listingId, status: 'available' },     // seul le premier passe
     { status: 'sold', soldOnline: { at, priceCents, purchaseId } })
   if (!sold) await gateway.refund(paymentIntentId)        // le second est remboursé
   ```

5. **Idempotence** : un événement rejoué ne vend ni ne rembourse deux fois.
6. **Garde-fou** : une clé `sk_live_` est refusée au démarrage, donc uniquement le mode test.

### 6.12 La messagerie (`conversation.service.ts`)

- **Premier contact** : `findOneAndUpdate` avec `upsert` crée la conversation, ou reprend celle qui existe. Si deux premiers messages arrivent ensemble, on relance l'opération après l'erreur `11000`.
- **Envoi** : on crée le message, on met à jour l'aperçu, on fait **`$inc` des non-lus de l'autre** et on note sa propre date de lecture.
- **Accès** : la conversation seulement si je suis l'acheteur OU le vendeur. Sinon : 404.
- **Pastille** : `unreadCount` additionne les non-lus avec un `aggregate`. Le front le relit toutes les 30 s.
- **« Vu »** : affiché si l'autre a lu après mon dernier message.

### 6.13 Le front : les points techniques

| Sujet | Explication |
|---|---|
| Ordre des fournisseurs dans `App.tsx` | `BrowserRouter` > `AuthProvider` > `FavoritesProvider` > `UnreadProvider`, car les deux derniers ont besoin de l'utilisateur |
| Routes privées | regroupées sous `<Route element={<RequireAuth />}>`, qui redirige vers `/login` |
| Session expirée | `api.ts` reçoit un 401 alors qu'un jeton a été envoyé : il vide la session et redirige vers `/login?expired=1` |
| Chargement des données | un drapeau `active` dans `useEffect` ignore une réponse arrivée après qu'on a quitté la page |
| Prix | `parsePrice("85,50")` → `8550` centimes, sans calcul à virgule |
| Accessibilité | `Field` relie label, aide et erreur (`aria-describedby`) ; champ commune en combobox WAI-ARIA (clavier, `aria-activedescendant`) |
| Validation navigateur | pour le confort de l'utilisateur seulement : le serveur revalide toujours |

### 6.14 Les tests (`backend/tests/`)

- **254 tests back-end**, répartis en 14 fichiers, plus 11 tests front.
- **Une vraie MongoDB en mémoire par fichier**, vidée avant chaque test ; Supertest appelle `createApp()`.
- **Stripe simulé** avec `jest.spyOn`, mais les webhooks sont **signés avec la vraie fonction de Stripe**.
- **Contre-épreuves** : on a cassé exprès chaque règle critique pour vérifier que son test devenait rouge :
  - filtre `ownerId` retiré → l'isolation échoue ;
  - condition `status: 'available'` retirée → la double vente passe ;
  - vérification de signature retirée → le faux webhook passe ;
  - filtre participant retiré → un tiers lit la conversation.

### 6.15 Docker (`docker-compose.yml`)

| Service | Port | À savoir |
|---|---|---|
| `mongo` | 27017 | volume nommé `mongo-data` : les données survivent à un redémarrage |
| `backend` | 3000 | code monté en volume, rechargé à chaud par `tsx watch` |
| `frontend` | 5173 | `API_PROXY_TARGET=http://backend:3000` |
| `stripe` | — | relaie les webhooks vers l'API ; s'arrête proprement sans clé |

- **Entre conteneurs**, on utilise le nom du service (`mongo`, `backend`), pas `localhost`.
- **Les secrets** sont dans `backend/.env`, ignoré par git ; `.env.example` donne seulement les noms.
- **C'est une configuration de développement.** En production : front compilé et servi en statique, API compilée (`node dist/server.js`).

---

## 7. Correspondance avec le barème

| Critère (points) | Où on le prouve |
|---|---|
| Fonctionnalités et intégration full stack (6) | démo, parties 3.1 et 3.2 |
| Architecture, qualité, organisation du code (5) | partie 2 (couches, `api.ts`, choix justifiés) |
| Robustesse, validation, sécurité, tests (4) | Zod strict, 404 au lieu de 403, signature Stripe, opérations atomiques, 254 tests + contre-épreuves (6.4 à 6.14) |
| Organisation et travail d'équipe (2) | partie 4.1 |
| Clarté de la présentation et de la démo (3) | parcours préparé, comptes de démo, plan B (3.3) |

---

## 8. Glossaire

| Terme | En une phrase |
|---|---|
| **Middleware** | une fonction exécutée avant la route, par exemple `requireAuth` |
| **JWT** | un jeton signé qui contient l'id de l'utilisateur, vérifiable sans base de données |
| **bcrypt** | un hachage volontairement lent, avec un sel, pour stocker les mots de passe |
| **ObjectId** | l'identifiant de MongoDB : 24 caractères hexadécimaux |
| **Index unique** | une règle de la base qui refuse les doublons (erreur `11000`) |
| **Atomique** | lu, vérifié et écrit en une seule opération, sans fenêtre pour une autre requête |
| **Idempotent** | refaire la même opération donne le même résultat |
| **Upsert** | « mets à jour, ou crée si ça n'existe pas » |
| **Webhook** | un appel qu'un service externe (Stripe) envoie à notre API pour la prévenir |
| **Proxy** | Vite relaie `/api` vers l'API : même origine, donc pas de CORS |
| **CORS** | une règle du navigateur qui bloque les appels vers une autre origine sans autorisation |
| **Projection** | choisir les champs renvoyés par une requête (`.select(...)`) |
| **Mise à jour optimiste** | afficher le changement tout de suite, et l'annuler si le serveur refuse |
| **Contre-épreuve** | casser exprès une règle pour vérifier que son test échoue |
