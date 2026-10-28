# Implementation Plan: Paiement de démonstration

**Branch**: `005-paiement-demo` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-paiement-demo/spec.md`

## Summary

« Acheter » crée un **achat en attente** (prix figé par le serveur) et une **session Stripe Checkout** en
mode test ; l'acheteur paie sur la page hébergée par Stripe (aucune donnée de carte chez Occaz). La vente
n'est validée que par le **webhook** `checkout.session.completed`, dont la signature est vérifiée : une
mise à jour **atomique** (« passer vendue seulement si encore disponible ») garantit une seule vente ; le
paiement perdant est remboursé automatiquement. Une page « Mes achats » et la mention « Vendue en ligne »
côté vendeur complètent le parcours. Le serveur refuse de démarrer avec une clé qui n'est pas de test.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24

**Primary Dependencies**: + `stripe` (SDK officiel, v23) ; Stripe CLI (outil de dev, hors dépôt) pour
relayer les webhooks en local

**Storage**: MongoDB, nouvelle collection `purchases` ; `listings` + `soldOnline`

**Testing**: Jest + Supertest (`purchases.test.ts`, `stripe-webhook.test.ts`) **sans réseau** : la passerelle
Stripe est remplacée par un faux en test, et les webhooks sont signés avec
`stripe.webhooks.generateTestHeaderString` pour tester la vraie vérification de signature

**Target Platform**: identique au MVP ; démo en local avec `stripe listen`

**Project Type**: application web existante

**Performance Goals**: sans objet (une transaction à la fois en démo)

**Constraints**: clés de test uniquement (`sk_test_…`) ; secrets en variables d'environnement ; webhook lu
en corps **brut** (avant `express.json`) ; montant calculé serveur

**Scale/Scope**: 3 routes + 1 webhook, 1 modèle, 1 passerelle, 1 page, 1 bouton

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|---|---|---|
| I. Stack imposée | `stripe` est un SDK de service, pas une brique remplacée ; justifié (Complexity Tracking) | ✅ |
| II. Contrat API | Routes sous `/api`, `{ items }`, `id` public, erreurs au format v1 ; routes existantes inchangées (le statut `sold` existe déjà) | ✅ |
| III. Sécurité / isolation | Achats filtrés par `buyerId` → 404 ; webhook authentifié par signature ; aucune donnée de carte ; secrets en env ; refus des clés réelles | ✅ |
| IV. Validation serveur | Annonce disponible, pas la sienne, catégorie et plafond vérifiés ; prix lu en base | ✅ |
| V. Tests comme preuve | Double paiement → 1 vente + 1 remboursement ; webhook falsifié → aucune vente ; doublon d'événement ; isolation A/B/C | ✅ |
| VI. Simplicité / bonus | Mode test seulement, pas de Connect, pas de facture ; écart avec la spec 001 rappelé dans la spec | ⚠️ justifié |

**Post-design re-check** : ✅ (écart de périmètre assumé et documenté dans [spec.md](./spec.md)).

## Project Structure

### Documentation (this feature)

```text
specs/005-paiement-demo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/purchases.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config.ts                       # NOUVEAU : lit STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / FRONT_URL, refuse sk_live_
│   ├── payments/gateway.ts             # NOUVEAU : createCheckout(), refund() — seule couche qui parle à Stripe
│   ├── models/purchase.ts              # NOUVEAU
│   ├── models/listing.ts               # + soldOnline { at, priceCents, purchaseId }
│   ├── services/purchase.service.ts    # NOUVEAU : start, list, handleCompleted, handleExpired
│   ├── services/listing.service.ts     # update : statut verrouillé si soldOnline ; remove : achats en attente expirés
│   ├── controllers/purchase.controller.ts
│   ├── routes/purchases.ts             # requireAuth
│   ├── routes/stripe-webhook.ts        # express.raw, vérification de signature
│   └── app.ts                          # webhook monté AVANT express.json
├── .env.example                        # + STRIPE_SECRET_KEY=sk_test_xxx, STRIPE_WEBHOOK_SECRET=whsec_xxx, FRONT_URL
├── openapi.yaml
└── tests/purchases.test.ts, tests/stripe-webhook.test.ts

frontend/src/
├── pages/PublicListing.tsx             # bouton « Acheter (démo) » + bandeau démo
├── pages/Purchases.tsx                 # NOUVEAU : « Mes achats » (+ retour de paiement ?session=…)
├── pages/ListingDetail.tsx             # « Vendue en ligne le … pour … »
├── components/DemoBanner.tsx           # NOUVEAU
└── App.tsx                             # route /achats, entrée dans le menu du compte
```

**Structure Decision**: tout appel à Stripe passe par `payments/gateway.ts`, ce qui permet de le remplacer
par un faux dans les tests et de garder le service métier lisible.

## Complexity Tracking

| Ajout | Pourquoi nécessaire | Alternative plus simple écartée |
|---|---|---|
| SDK `stripe` | Création de sessions et **vérification de signature** des webhooks (sécurité) | Appels HTTP manuels : vérification de signature à réécrire, risque d'erreur |
| Webhook + Stripe CLI en dev | Seule source fiable de confirmation (FR-004) | Valider au retour du navigateur : falsifiable |
| Collection `purchases` | Suivre en attente / confirmé / remboursé et l'unicité de la vente | Champ dans l'annonce : ne gère pas deux acheteurs concurrents |
