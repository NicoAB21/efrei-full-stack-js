---
description: "Tâches d'implémentation du paiement de démonstration"
---

# Tasks: Paiement de démonstration

**Input**: Design documents from `/specs/005-paiement-demo/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/purchases.openapi.yaml](./contracts/purchases.openapi.yaml)

**Tests**: OBLIGATOIRES (constitution V), **sans réseau** : la passerelle Stripe est remplacée par un faux
(`jest.spyOn`), les webhooks sont signés avec `stripe.webhooks.generateTestHeaderString`.

**Organization**: US1 acheter, US2 refus / abandon, US3 une seule vente, US4 achats et ventes (spec.md).

**Choix ajouté au plan** : le détail public renvoie `buyable` (booléen calculé par le serveur : paiement
activé, annonce disponible, catégorie autorisée, prix ≤ 10 000 €) ; le front n'y ajoute que « pas sa
propre annonce ». Les seuils ne sont donc écrits qu'une fois, côté serveur.

---

## Phase 1: Setup

- [x] T001 Installer le SDK `stripe` dans `backend/package.json` (`npm install stripe`) ; ajouter à `backend/.env.example` les lignes commentées `# STRIPE_SECRET_KEY=sk_test_xxx`, `# STRIPE_WEBHOOK_SECRET=whsec_xxx`, `# FRONT_URL=http://localhost:5173` (paiement désactivé si absentes)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 Créer `backend/src/config.ts` : `paymentsConfig()` lit `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONT_URL` ; renvoie `null` si `STRIPE_SECRET_KEY` est absente (fonctionnalité désactivée) ; lève une erreur claire si la clé ne commence pas par `sk_test_`, si le secret ne commence pas par `whsec_` ou si `FRONT_URL` manque ; appeler `paymentsConfig()` au démarrage dans `backend/src/server.ts` (arrêt avec message si erreur, log « Paiement de démonstration activé / désactivé »)
- [x] T003 Créer `backend/src/payments/gateway.ts` : objet `gateway = { createCheckout({ purchaseId, listingId, title, priceCents }), refund(paymentIntentId), verifyEvent(rawBody, signature) }` ; seule couche qui importe `stripe` ; `createCheckout` crée une session Checkout `mode: 'payment'`, `currency: 'eur'`, `unit_amount: priceCents`, `product_data.name` = « [DÉMO] titre », `metadata { purchaseId, listingId }`, `client_reference_id: purchaseId`, `expires_at` = maintenant + 30 min, `success_url` = `${FRONT_URL}/achats?achat=<purchaseId>`, `cancel_url` = `${FRONT_URL}/annonces/<listingId>?paiement=annule` ; renvoie `{ id, url }`
- [x] T004 [P] Créer `backend/src/models/purchase.ts` : `buyerId` (ObjectId, requis), `listingId` (ObjectId, requis), `listingTitle` (string, « copie au lancement »), `priceCents` (number, « lu en base au lancement, jamais fourni par le client »), `status` (enum `pending | confirmed | refunded | expired`, défaut `pending`), `checkoutSessionId` (string, unique), `paymentIntentId` (string | null), `confirmedAt` (Date | null), `timestamps` ; index `{ buyerId: 1, createdAt: -1 }`, `{ buyerId: 1, listingId: 1, status: 1 }` ; `toJSON: toJSONOptions` en retirant `buyerId`, `checkoutSessionId`, `paymentIntentId`
- [x] T005 [P] Ajouter à `backend/src/models/listing.ts` le sous-objet facultatif `soldOnline { at: Date, priceCents: number, purchaseId: ObjectId }` (absent par défaut, sans `_id`)
- [x] T006 Créer `backend/tests/payments-helpers.ts` : `fakeGateway()` (spyOn `createCheckout` → `{ id: 'cs_test_<n>', url: 'https://checkout.stripe.com/c/pay/cs_test_<n>' }`, `refund` → enregistre l'appel) et `sendWebhook(app, event, secret?)` qui signe le corps avec `generateTestHeaderString` ; définir dans `backend/tests/setup.ts` `STRIPE_SECRET_KEY=sk_test_fake`, `STRIPE_WEBHOOK_SECRET=whsec_test_fake`, `FRONT_URL=http://localhost:5173`

---

## Phase 3: User Story 1 - Acheter une annonce (Priority: P1) 🎯 MVP

**Goal**: « Acheter » envoie sur Stripe ; le webhook signé vend l'annonce.

**Independent Test**: POST achat → 201 + URL ; webhook `completed` signé → annonce `sold`, achat `confirmed`, absente de la vitrine.

### Tests ⚠️

- [x] T007 [P] [US1] Écrire `backend/tests/purchases.test.ts` : lancement → 201 `{ url }`, `createCheckout` appelé avec le prix **lu en base** (un `priceCents` envoyé par le client → 400, champ inconnu) ; double clic → même URL, une seule session créée ; sa propre annonce → 400 ; catégorie `immobilier` / `vehicules` → 400 ; prix 1 000 001 → 400 ; annonce vendue ou inexistante → 404 ; `listingId` mal formé → 400 ; sans token → 401 ; Stripe injoignable (`createCheckout` rejette) → 502 « Paiement indisponible, réessayez plus tard » et aucun achat créé ; `buyable` du détail public : `true` pour une annonce achetable, `false` pour Immobilier, > 10 000 € ou paiement désactivé
- [x] T008 [P] [US1] Écrire `backend/tests/stripe-webhook.test.ts` (partie US1) : `checkout.session.completed` signé avec `payment_status: 'paid'` → 200, annonce `sold` avec `soldOnline { at, priceCents }`, achat `confirmed` avec `confirmedAt`, annonce absente de `GET /api/public/listings`
- [x] T009 [P] [US1] Ajouter à `backend/tests/purchases.test.ts` : démarrage refusé avec `sk_live_…` et avec un secret qui n'est pas `whsec_…` (`paymentsConfig()` lève) ; sans `STRIPE_SECRET_KEY` → `null`, `POST /api/purchases` → 404

### Implementation

- [x] T010 [US1] Créer `backend/src/schemas/purchase.ts` : `purchaseCreateSchema = z.strictObject({ listingId: objectId })` ; constantes `MAX_BUYABLE_CENTS = 1_000_000`, `NOT_BUYABLE_CATEGORIES = ['immobilier', 'vehicules']` et `isBuyable(listing)`
- [x] T011 [US1] Créer `backend/src/services/purchase.service.ts` : `start(buyerId, listingId)` (annonce `available` sinon 404 ; sa propre annonce, catégorie ou plafond → 400 ; achat `pending` existant de moins de 30 min pour ce couple → renvoie son URL stockée ; sinon crée l'achat avec `priceCents` et `listingTitle` lus en base, appelle `gateway.createCheckout`, enregistre `checkoutSessionId` et `checkoutUrl` ; si Stripe échoue : supprime l'achat et lève une erreur 502 `PAYMENT_UNAVAILABLE`) ; `handleCompleted(session)` (voir T020 pour l'atomicité)
- [x] T012 [US1] Ajouter le champ interne `checkoutUrl` (string, retiré de `toJSON`) à `backend/src/models/purchase.ts` et le code `PAYMENT_UNAVAILABLE` (502) à `backend/src/errors.ts`
- [x] T013 [US1] Créer `backend/src/controllers/purchase.controller.ts` et `backend/src/routes/purchases.ts` (`requireAuth`, `POST /` → 201 `{ url }`, `GET /` → `{ items }`) ; routes non montées (404 via le fallback) si `paymentsConfig()` est `null`
- [x] T014 [US1] Créer `backend/src/routes/stripe-webhook.ts` : `express.raw({ type: 'application/json' })`, `gateway.verifyEvent(req.body, req.headers['stripe-signature'])` (échec → 400 `INVALID_INPUT`, aucun effet), dispatch `checkout.session.completed` (si `payment_status === 'paid'`) et `checkout.session.expired`, autres événements → 200 ignorés ; le monter sur `/api/stripe/webhook` **avant** `express.json()` dans `backend/src/app.ts`, avec `/api/purchases`
- [x] T015 [US1] Dans `backend/src/services/listing.service.ts` : la projection publique ajoute `buyable` (= paiement activé && `isBuyable(listing)`) au détail `GET /api/public/listings/:id`
- [x] T016 [P] [US1] Créer `frontend/src/components/DemoBanner.tsx` : bandeau `role="note"` « Paiement de démonstration, aucun débit réel » (icône Lucide `FlaskConical`) ; styles `.demo-banner` dans `frontend/src/design-system/components.css`
- [x] T017 [US1] Dans `frontend/src/pages/PublicListing.tsx` : si `listing.buyable` et pas sa propre annonce → bouton « Acheter (démo) » + `DemoBanner` ; visiteur non connecté → lien « Connectez-vous pour acheter » ; clic → `POST /purchases` puis `window.location.assign(url)` ; erreur affichée dans une `Alert` ; type `buyable?: boolean` dans `frontend/src/constants.ts`
- [x] T018 [US1] Créer `frontend/src/pages/Purchases.tsx` (« Mes achats ») : avec `?session=` → message « Achat confirmé » si l'achat le plus récent est `confirmed`, sinon « Paiement en cours de confirmation » avec un rechargement de la liste toutes les 2 s (5 essais maximum) ; `DemoBanner` ; route `/achats` dans `RequireAuth` et entrée « Mes achats » dans le menu du compte de `frontend/src/App.tsx`

**Checkpoint**: achat de bout en bout avec `stripe listen` et la carte `4242 4242 4242 4242`.

---

## Phase 4: User Story 2 - Paiement refusé ou abandonné (Priority: P1)

**Goal**: un paiement non confirmé ne vend jamais.

**Independent Test**: webhook falsifié ou `expired` → annonce disponible.

### Tests ⚠️

- [x] T019 [P] [US2] Ajouter à `backend/tests/stripe-webhook.test.ts` : signature faite avec un autre secret → 400, annonce et achat inchangés ; sans en-tête `Stripe-Signature` → 400 ; `completed` avec `payment_status: 'unpaid'` → 200, rien ne change ; `checkout.session.expired` → achat `expired`, annonce `available`

### Implementation

- [x] T020 [US2] Ajouter `handleExpired(session)` à `backend/src/services/purchase.service.ts` (`findOneAndUpdate({ checkoutSessionId, status: 'pending' }, { status: 'expired' })`) ; dans `frontend/src/pages/PublicListing.tsx`, `?paiement=annule` → `Alert` « Paiement annulé, l'annonce est toujours disponible »

---

## Phase 5: User Story 3 - Une seule vente par annonce (Priority: P1)

**Goal**: premier paiement confirmé gagnant, l'autre remboursé.

**Independent Test**: deux webhooks `completed` simultanés sur la même annonce → 1 vente, 1 remboursement.

### Tests ⚠️

- [x] T021 [P] [US3] Ajouter à `backend/tests/stripe-webhook.test.ts` : deux acheteurs, deux webhooks `completed` envoyés **en parallèle** (`Promise.all`) → exactement 1 achat `confirmed`, 1 `refunded`, `refund` appelé une fois avec le bon `payment_intent` ; même événement rejoué → 200, aucun nouvel effet ni remboursement ; annonce supprimée ou remise `unavailable` avant le webhook → achat `refunded` ; prix modifié après le lancement → `soldOnline.priceCents` = prix figé de l'achat
- [x] T022 [P] [US3] Ajouter à `backend/tests/listings.test.ts` : PATCH `status: 'available'` d'une annonce `soldOnline` → 400 « Annonce vendue en ligne : elle ne peut pas être remise en vente » ; DELETE → 204

### Implementation

- [x] T023 [US3] Compléter `handleCompleted(session)` dans `backend/src/services/purchase.service.ts` : achat introuvable ou déjà dans un état final → rien ; sinon `Listing.findOneAndUpdate({ _id: listingId, status: 'available' }, { status: 'sold', soldOnline: { at, priceCents: purchase.priceCents, purchaseId } })` → succès : `Purchase.findOneAndUpdate({ _id, status: 'pending' }, { status: 'confirmed', confirmedAt, paymentIntentId })` ; `null` : passer l'achat `pending` → `refunded` par `findOneAndUpdate` et appeler `gateway.refund(paymentIntentId)` **seulement si** cette transition a réussi (idempotence : un événement rejoué ne rembourse jamais deux fois). Cas rejoué après une vente réussie : l'annonce est `sold` avec `soldOnline.purchaseId` = cet achat → confirmer, ne pas rembourser
- [x] T024 [US3] Dans `update` de `backend/src/services/listing.service.ts` : si l'annonce a `soldOnline` et que `status` demandé ≠ `sold` → 400 avec le message de T022 ; dans `remove`, passer les achats `pending` de l'annonce en `expired`

---

## Phase 6: User Story 4 - Voir ses achats et ses ventes (Priority: P2)

**Goal**: trace pour l'acheteur et le vendeur, isolée.

**Independent Test**: l'acheteur voit son achat, le vendeur « Vendue en ligne », C ne voit rien.

### Tests ⚠️

- [x] T025 [P] [US4] Ajouter à `backend/tests/purchases.test.ts` : `GET /api/purchases` → items du plus récent au plus ancien avec `id, listingId, listingTitle, priceCents, status, createdAt, confirmedAt`, sans `buyerId`, `checkoutSessionId`, email ; C voit `[]` pour les achats de A et B ; `GET /api/listings/:id` du vendeur contient `soldOnline { at, priceCents }` sans donnée de l'acheteur

### Implementation

- [x] T026 [US4] Ajouter `list(buyerId)` à `backend/src/services/purchase.service.ts` (`Purchase.find({ buyerId }).sort({ createdAt: -1, _id: -1 })`)
- [x] T027 [US4] Dans `frontend/src/pages/Purchases.tsx` : liste titre (lien vers l'annonce si confirmée), prix (`formatPrice`), date, état « Confirmé » / « En attente de confirmation » / « Annonce déjà vendue, remboursé » / « Expiré » ; état vide « Aucun achat pour l'instant »
- [x] T028 [P] [US4] Dans `frontend/src/pages/ListingDetail.tsx` : si `soldOnline` → `Alert` « Vendue en ligne le … pour … (démonstration) » et masquer « Remettre en vente » ; type `soldOnline?: { at: string; priceCents: number }` dans `frontend/src/constants.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T029 Fusionner [contracts/purchases.openapi.yaml](./contracts/purchases.openapi.yaml) dans `backend/openapi.yaml` (+ `soldOnline` dans `Listing`, `buyable` dans le détail public, réponse 502) ; `backend/tests/openapi.test.ts` doit passer
- [x] T030 [P] Ajouter au `README.md` une section « Paiement de démonstration » : variables, `stripe listen --forward-to localhost:3000/api/stripe/webhook`, cartes de test, comportement sans clés
- [x] T031 Vérification : `npm run lint && npm run build && npm test` (back et front) ; contre-épreuves (retirer `status: 'available'` du filtre de T023 → le test de double paiement doit échouer ; retirer la vérification de signature → le test de webhook falsifié doit échouer ; restaurer depuis une copie) ; parcours [quickstart.md](./quickstart.md) avec la carte `4242…` et `4000 0000 0000 0002`

---

## Écarts constatés à l'implémentation

- **T013** : pas de `purchase.controller.ts`, les deux handlers tiennent dans `routes/purchases.ts` (comme `routes/public.ts`).
- **T018** : retour de Stripe sur `/achats?achat=<purchaseId>` (et non `?session=`) : le test réel avec deux acheteurs a montré
  que « l'achat le plus récent » n'est pas toujours celui qu'on vient de payer (session réutilisée après un double clic).
- **T024** : la suppression d'une annonce ne passe **pas** ses achats en attente à `expired` : un paiement confirmé ensuite
  doit trouver l'achat `pending` pour être remboursé (US3, scénario 3). Ils expirent avec la session Stripe.
- **T027** : pas de lien vers l'annonce depuis « Mes achats » : une annonce vendue n'est plus publique (404).
- **Stripe CLI 1.55** : `stripe listen` exige `--events checkout.session.completed,checkout.session.expired`.
- **API Stripe 2026** : `payment_method_types` est refusé ; les moyens de paiement se règlent dans le tableau de bord.
- **Ajout** : `tests/setup.ts` retente le démarrage de MongoMemoryServer si le port tiré est déjà pris (échecs
  intermittents « Port already in use » devenus plus fréquents avec 13 suites).

- **2026-10-28** : mentions « démo » retirées de l'interface (FR-010 retiré, voir spec.md) ; retour de Stripe sur une
  page de confirmation dédiée `/paiement?achat=<id>` (récapitulatif avec photo, prochaines étapes) au lieu de
  « Mes achats » ; l'achat fige aussi la vignette de la photo principale (`listingPhotoUrl`).

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T002–T006) → US1 → US2, US3, US4 (indépendantes entre elles, toutes sur `purchase.service.ts`, donc en série si une seule personne) → Polish.
- Dans chaque story : tests d'abord (ils échouent), puis implémentation.

## Parallel Opportunities

- T004 et T005 (modèles différents) ; T007, T008, T009 (fichiers de test différents) ; T016 en parallèle du back ; T022, T025, T028.

## Implementation Strategy

1. **MVP** : Phases 1–3 (achat qui aboutit, webhook signé) → démo possible.
2. US2 + US3 avant toute démo publique : sans elles, une annonce pourrait être vendue deux fois.
3. US4 et Polish ensuite.
