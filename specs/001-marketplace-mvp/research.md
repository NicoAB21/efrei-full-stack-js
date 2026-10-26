# Research: Occaz — MVP de petites annonces

Phase 0 du plan. Aucun « NEEDS CLARIFICATION » restant : la stack est imposée par la
constitution, les choix ci-dessous ne portent que sur ce que le livret laisse ouvert.

## 1. Version d'Express

- **Decision**: Express 5.
- **Rationale**: les erreurs levées dans un handler `async` sont transmises automatiquement au
  middleware d'erreur ; pas besoin de wrapper `asyncHandler` ni de dépendance en plus.
- **Alternatives considered**: Express 4 + `express-async-errors` (dépendance inutile).

## 2. Validation des entrées

- **Decision**: Zod, schémas `.strict()` ; `create` complet, `update` = `create.partial()` +
  refus de l'objet vide. Id de route validé par la regex `^[a-f0-9]{24}$`.
- **Rationale**: `.strict()` donne gratuitement le refus des propriétés inconnues, d'`id` et
  d'`ownerId` (IV) ; `z.number().int().positive().max(Number.MAX_SAFE_INTEGER)` couvre les
  prix ; types TypeScript inférés. `mongoose.isValidObjectId` accepte toute chaîne de
  12 caractères, d'où la regex.
- **Alternatives considered**: validation manuelle (plus de code, plus de risques d'oubli) ;
  validateurs Mongoose seuls (ne refusent pas les champs inconnus, erreurs moins lisibles).

## 3. Base de données pour les tests

- **Decision**: `mongodb-memory-server`, une instance par fichier de test, collections vidées
  avant chaque test.
- **Rationale**: base isolée et déterministe exigée (V) sans dépendre d'un Mongo lancé à côté.
- **Alternatives considered**: base `occaz_test` sur le conteneur Docker (risque d'oublier de
  le démarrer, état partagé entre runs).

## 4. Lancement en développement

- **Decision**: `docker-compose.yml` à la racine avec trois services : `mongo` (mongo:7,
  volume nommé), `backend` (Node 24, `npm run dev` avec le code monté en volume) et
  `frontend` (Node 24, `vite --host`). `docker compose up` lance toute la stack. Chaque
  projet reste aussi lançable seul avec `npm run dev` (Mongo dans Docker ou Atlas via
  `MONGODB_URI`).
- **Rationale**: une seule commande pour toute l'équipe, sans installer MongoDB ; le montage
  du code conserve le rechargement à chaud.
- **Alternatives considered**: Mongo seul dans Docker (chacun lance back et front à la main) ;
  installation native de MongoDB (dépend de l'OS).

## 5. JWT

- **Decision**: `jsonwebtoken`, HS256, payload `{ sub: userId }`, expiration fixe `2h`, secret
  `JWT_SECRET`. Le serveur refuse de démarrer si `JWT_SECRET` est absent.
- **Rationale**: suffisant pour la démo ; l'expiration permet de tester le cas limite
  « session expirée ». Pas de variable de config pour la durée (VI).
- **Alternatives considered**: refresh tokens (hors MVP).

## 6. Stockage du token côté front

- **Decision**: `localStorage`, envoi en `Authorization: Bearer`. Toute réponse `401` vide la
  session et redirige vers `/login` avec un message.
- **Rationale**: le contrat impose Bearer ; un cookie httpOnly demanderait CSRF et CORS
  credentials. Risque XSS assumé et à mentionner en soutenance (React échappe le rendu).
- **Alternatives considered**: cookie httpOnly ; stockage mémoire seul (perdu au rechargement).

## 7. Communication front ↔ back

- **Decision**: proxy Vite (`server.proxy` et `preview.proxy`) de `/api` vers
  `API_PROXY_TARGET` (défaut `http://localhost:3000`, `http://backend:3000` dans Docker).
  Le front appelle des URL relatives `/api/...`.
- **Rationale**: pas de CORS donc pas de dépendance `cors` ; mêmes URL en dev et en preview.
- **Alternatives considered**: package `cors` (à ajouter seulement en cas de déploiement sur
  deux domaines).

## 8. Documentation OpenAPI

- **Decision**: fichier `openapi.yaml` écrit à la main, chargé avec `yaml` et servi par
  `swagger-ui-express` sur `/api/docs`.
- **Rationale**: un seul fichier lisible, qui sert aussi de contrat de référence aux tests.
- **Alternatives considered**: `swagger-jsdoc` (doc éparpillée dans des commentaires) ;
  génération depuis Zod (dépendance et configuration en plus).

## 9. Catégories et statuts

- **Decision**: codes ASCII stockés en base : `vehicules`, `immobilier`, `multimedia`,
  `maison`, `mode`, `loisirs`, `autre` ; statuts `available` / `sold`. Les libellés français
  vivent dans le front.
- **Rationale**: codes stables, utilisables tels quels en paramètre de requête (P2).
- **Alternatives considered**: stocker les libellés accentués (encodage d'URL, fautes de frappe).

## 10. Recherche publique (P2)

- **Decision**: filtres Mongo simples : `category`, `city` (égalité insensible à la casse),
  `q` (regex échappée, insensible à la casse, sur titre + description), `minPrice`/`maxPrice`
  en centimes ; tri `createdAt` décroissant ; plafond de 50 résultats.
- **Rationale**: suffisant pour quelques centaines d'annonces, aucun index texte à gérer.
- **Alternatives considered**: index `$text` (pas de recherche partielle « vél ») ; pagination
  (ajoutée si le volume le demande).

## 11. Hachage des mots de passe

- **Decision**: `bcrypt` (module natif), coût 10.
- **Rationale**: imposé par la constitution ; binaires précompilés disponibles pour Node 24.
- **Alternatives considered**: `bcryptjs` (repli si la compilation native échoue sous WSL).

## 12. Tests front

- **Decision**: aucun test automatisé front dans le MVP ; vérification manuelle via
  [quickstart.md](./quickstart.md).
- **Rationale**: le livret n'exige que Jest/Supertest côté API ; la sécurité est prouvée
  côté serveur (III).
- **Alternatives considered**: Vitest + Testing Library (bonus éventuel).
