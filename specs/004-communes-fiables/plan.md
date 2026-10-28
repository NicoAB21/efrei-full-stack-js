# Implementation Plan: Communes fiables

**Branch**: `004-communes-fiables` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-communes-fiables/spec.md`

## Summary

Le référentiel officiel des communes (API Géo de l'État, 34 969 communes, 35 493 couples commune/code
postal) est téléchargé **une fois** par un script et versionné en JSON compact (~1,4 Mo) dans le back.
Chargé en mémoire au démarrage, il sert une route publique de suggestions (`GET /api/communes?q=`) et
valide chaque annonce : le corps reçoit `cityCode` (code officiel INSEE) + `postalCode`, le serveur
vérifie le couple et enregistre le nom officiel dans `city`. La vitrine filtre par commune (casse, accents,
tirets ignorés). Un script rattache une fois les annonces existantes quand leur ville est sans ambiguïté.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24

**Primary Dependencies**: aucune nouvelle (Express, Mongoose, Zod ; `fetch` natif pour le script de
téléchargement)

**Storage**: `backend/data/communes.json` (référentiel, lecture seule) ; `listings` + `cityCode`, `postalCode`,
`cityKey` (nom normalisé, indexé)

**Testing**: Jest + Supertest (`communes.test.ts`, mise à jour de `listings.test.ts` / `public.test.ts` /
`isolation.test.ts`, `migrate-communes.test.ts`) sur le vrai fichier, sans réseau

**Target Platform**: identique au MVP

**Project Type**: application web existante

**Performance Goals**: suggestion en mémoire (index par préfixe) ; 20 résultats maximum par requête

**Constraints**: aucune dépendance réseau à l'exécution ni en test ; pas d'adresse plus précise que la
commune ; sorties des routes existantes compatibles (`city` reste un texte)

**Scale/Scope**: 1 module référentiel, 1 route publique, 2 scripts, 1 composant combobox, changement du
schéma d'annonce

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|---|---|---|
| I. Stack imposée | Aucune brique nouvelle | ✅ |
| II. Contrat API | Nouvelle route `GET /api/communes` (`{ items }`) ; les 5 routes CRUD gardent leurs URL et codes ; **corps** : `city` remplacé par `cityCode` + `postalCode` ; réponses : `city` conservé + 2 champs | ✅ (changement de corps assumé, research §4) |
| III. Sécurité / isolation | Route communes publique et en lecture seule ; aucune donnée personnelle ; isolation des annonces inchangée | ✅ |
| IV. Validation serveur | Couple (cityCode, postalCode) vérifié contre le référentiel ; `city` envoyé par le client refusé (strict) | ✅ |
| V. Tests comme preuve | Commune inventée / code postal incohérent → 400 ; recherche accents/tirets ; rattachement de l'existant ; tests existants adaptés | ✅ |
| VI. Simplicité / bonus | Fichier local, pas de base de communes, pas de recherche par distance | ✅ |

**Post-design re-check** : ✅

## Project Structure

### Documentation (this feature)

```text
specs/004-communes-fiables/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/communes.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── data/communes.json                 # NOUVEAU : référentiel compact + source et date
├── scripts/fetch-communes.ts          # NOUVEAU : télécharge et compacte (npm run data:communes)
├── scripts/migrate-communes.ts        # NOUVEAU : rattache les annonces existantes (npm run migrate:communes)
├── src/communes/index.ts              # NOUVEAU : chargement, normalisation, search(), find(), byName()
├── src/routes/communes.ts             # NOUVEAU : GET /api/communes?q=
├── src/schemas/listing.ts             # create : cityCode + postalCode requis ; city refusé
├── src/models/listing.ts              # + cityCode, postalCode, cityKey (indexé)
├── src/services/listing.service.ts    # create/update : nom officiel ; listPublic : filtre par commune
├── src/app.ts                         # monte /api/communes
├── openapi.yaml
└── tests/communes.test.ts (+ adaptations des tests existants, helper de fixture d'annonce)

frontend/src/
├── components/CommuneField.tsx        # NOUVEAU : combobox ARIA (suggestions, clavier, lecteur d'écran)
├── pages/ListingForm.tsx              # CommuneField à la place du champ Ville
├── pages/Home.tsx                     # champ Ville de la recherche = suggestions ; puces groupées par cityCode
├── listings.ts / constants.ts         # types cityCode, postalCode
└── (affichage) « Lyon (69003) » sur les détails
```

**Structure Decision**: le référentiel est un module en mémoire (`src/communes/`), pas une collection :
il est en lecture seule, change une fois par an et doit marcher sans base pour les tests.

**Coordination** : `ListingForm` est aussi modifié par 003 (photos) ; implémenter après 003 et rebaser.

## Complexity Tracking

| Écart | Pourquoi | Alternative écartée |
|---|---|---|
| Fichier de données de ~1,4 Mo versionné | Validation et suggestions sans réseau, tests déterministes (décision équipe) | Appel à l'API Géo à chaque requête : dépend d'Internet en démo et en test |
| Changement du corps de création d'annonce (`cityCode` + `postalCode` au lieu de `city`) | Le nom seul est ambigu (4 « Saint-Denis ») ; il faut un identifiant officiel | Accepter `city` libre et deviner : ne résout pas les homonymes |
