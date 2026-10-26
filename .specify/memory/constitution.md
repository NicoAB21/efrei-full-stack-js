<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Principes ajoutés : I. Stack imposée en TypeScript, II. Contrat API strict,
  III. Sécurité et isolation des comptes, IV. Validation côté serveur,
  V. Tests comme preuve, VI. Simplicité (MVP d'abord)
- Sections ajoutées : Contraintes techniques et hygiène du dépôt, Workflow et livrables
- Sections supprimées : aucune
- TODO : aucun
-->

# Occaz Constitution

Occaz est un site de petites annonces entre particuliers (principe Leboncoin), réalisé
pour le module EFREI « Full Stack JS » (M1, octobre 2026). Le livret étudiant
(`LIVRET ETUDIANT V2.pdf`) fait référence pour la stack et les exigences transversales ;
le sujet métier est libre et remplace le catalogue TaskFlow/HabitLab/BudgetFlow.

## Core Principles

### I. Stack imposée, en TypeScript

- Front-end : React + Vite, en TypeScript. Back-end : Node.js + Express, en TypeScript.
- Données : MongoDB + Mongoose. Auth : bcrypt + JWT signé + middleware Bearer.
- Qualité : ESLint. Tests : Jest + Supertest. Doc : README.md, `.env.example`, OpenAPI/Swagger.
- Aucune substitution de brique (pas de NestJS, Next.js, Vue, PostgreSQL, Prisma…).
- Dépôt organisé en `frontend/` et `backend/`, chacun démarrable indépendamment.

Rationale : la stack est contractuelle dans le livret ; seul le langage passe de
JavaScript à TypeScript.

### II. Contrat API strict

Les règles transversales du « Contrat API v1 » du livret s'appliquent à la ressource
métier `listings` (annonces) exactement comme à `tasks` :

- Toutes les routes sous `/api`, JSON UTF-8, port lu depuis `PORT`.
- `GET /api/health` public → `200` `{"status":"ok"}`.
- `POST /api/auth/register` → `201`, `POST /api/auth/login` → `200`, réponse
  `{"user":{"id","email"},"token"}` ; email insensible à la casse ; mot de passe ≥ 8 caractères.
- Cinq routes CRUD : `GET/POST /api/listings`, `GET/PATCH/DELETE /api/listings/:id` ;
  liste dans l'enveloppe `{"items":[...]}` ; `DELETE` → `204` sans corps.
- Identifiant public `id` (string de l'ObjectId), jamais `_id` ; `ownerId` calculé
  serveur uniquement.
- Erreurs au format `{"error":{"code","message"}}` avec les codes `INVALID_INPUT` (400),
  `UNAUTHORIZED` (401), `NOT_FOUND` (404), `EMAIL_ALREADY_USED` (409).

Rationale : le correcteur teste automatiquement routes, formats et codes HTTP.

### III. Sécurité et isolation des comptes (NON-NEGOTIABLE)

- Toute route métier privée exige un JWT valide, sinon `401`.
- L'objet d'un autre compte est traité comme absent : `404` en lecture, modification
  et suppression.
- Jamais de `password`, `passwordHash`, JWT ou secret dans une réponse ou dans le dépôt.
- La clé JWT vient d'une variable d'environnement (`JWT_SECRET`).
- Masquer un bouton dans React ne remplace jamais une vérification dans Express.

### IV. Validation côté serveur

- Chaque entrée (corps, paramètres, id) est validée dans Express ; id malformé → `400`.
- `POST`/`PATCH` refusent `id`, `ownerId`, les propriétés inconnues et les types incorrects.
- `PATCH` est partiel et non vide.
- La validation React sert l'expérience utilisateur, pas la sécurité.

### V. Tests comme preuve

- La suite Jest/Supertest couvre au minimum : parcours CRUD nominal, entrée invalide → 400,
  absence de JWT → 401, isolation A/B (lecture et modification) → 404.
- L'app Express est importable sans ouvrir de port ; les tests utilisent une base isolée
  et des fixtures déterministes.
- Retirer le filtre propriétaire DOIT faire échouer un test.

### VI. Simplicité, MVP d'abord

- Le MVP obligatoire est terminé et testé avant tout bonus.
- Architecture back-end : routes → contrôleurs → services → modèles, sans couche en plus.
- Pas d'abstraction, de dépendance ou de configuration sans besoin réel et présent.
- Tout bonus a des critères d'acceptation et au moins un test dédié.

## Contraintes techniques et hygiène du dépôt

- Ne jamais versionner `node_modules`, `.env`, secrets, identifiants MongoDB réels ou
  données personnelles ; `.env.example` ne contient que des valeurs fictives.
- Interface responsive, utilisable au clavier, labels explicites, erreurs lisibles,
  focus visible.
- Les prix sont stockés en centimes (entier sûr, strictement positif) et affichés en euros
  (`12345` → `123,45 €`).
- Les commandes `lint`, `build` et `test` documentées dans le README s'exécutent réellement.

## Workflow et livrables

- Workflow spec-kit : constitution → specify → plan → tasks → implement.
- Commits petits et stables à chaque étape fonctionnelle (essayer un cas de réussite
  et un cas d'erreur avant de commiter).
- Livrables : dépôt Git individuel avec SHA final identifiable, README détaillé,
  OpenAPI/Swagger conforme aux routes réelles, app démontrable dans le navigateur,
  suite de tests exécutable, soutenance individuelle de 10 minutes.

## Governance

- Cette constitution prime sur les autres pratiques du projet ; en cas de conflit avec
  le livret étudiant officiel, le livret l'emporte et la constitution est amendée.
- Toute modification passe par `/speckit-constitution`, avec incrément de version :
  MAJOR (principe retiré ou redéfini), MINOR (principe ou section ajouté),
  PATCH (clarification).
- Chaque plan (`/speckit-plan`) vérifie sa conformité aux principes I à VI ; toute
  complexité supplémentaire doit être justifiée.

**Version**: 1.0.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-26
