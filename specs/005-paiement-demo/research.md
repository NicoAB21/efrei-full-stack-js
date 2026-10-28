# Research: Paiement de démonstration

## 1. Mode de paiement Stripe

- **Decision**: **Stripe Checkout** (page hébergée), `mode: "payment"`, une ligne
  `price_data { currency: "eur", unit_amount: priceCents, product_data: { name: title } }`,
  `metadata { purchaseId, listingId }`, `client_reference_id: purchaseId`,
  `expires_at` = maintenant + 30 min (minimum accepté par Stripe), `success_url` =
  `${FRONT_URL}/achats?achat=<purchaseId>`, `cancel_url` = `${FRONT_URL}/annonces/<id>?paiement=annule`.
- **Rationale**: aucune donnée de carte ne touche Occaz (FR-002) ; Stripe affiche le mode test.
- **Alternatives considered**: Payment Element intégré (plus de code front, données de carte dans notre
  page) ; Stripe Connect (reversement réel au vendeur, hors périmètre).

## 2. Garde-fou « test uniquement »

- **Decision**: au démarrage, `config.ts` exige `STRIPE_SECRET_KEY` commençant par `sk_test_` et
  `STRIPE_WEBHOOK_SECRET` commençant par `whsec_` ; sinon le serveur s'arrête avec un message clair. Si les
  variables sont absentes, la fonctionnalité est **désactivée** (bouton masqué, routes → 404) et le reste du
  site fonctionne.
- **Rationale**: FR-011, FR-012 ; un coéquipier sans compte Stripe peut toujours lancer le projet.

## 3. Confirmation par webhook

- **Decision**: `POST /api/stripe/webhook` monté **avant** `express.json()` avec
  `express.raw({ type: "application/json" })` ; `stripe.webhooks.constructEvent(body, signature, secret)` ;
  événements traités : `checkout.session.completed` (si `payment_status === "paid"`) et
  `checkout.session.expired`. Toute signature invalide → 400 et aucun effet.
- **Rationale**: FR-004 et SC-003 : seul Stripe peut valider une vente ; la vérification de signature exige
  le corps brut, d'où l'ordre de montage.

## 4. Une seule vente par annonce

- **Decision**: à la confirmation, une seule opération atomique :
  `Listing.findOneAndUpdate({ _id, status: "available" }, { status: "sold", soldOnline: {...} })`.
  Si elle renvoie l'annonce → achat `confirmed`. Si elle renvoie `null` (déjà vendue, supprimée, remise
  indisponible) → `gateway.refund(paymentIntent)` et achat `refunded`.
- **Rationale**: MongoDB garantit qu'un seul des deux paiements simultanés réussit la condition
  `status: "available"` (FR-005, SC-002) ; pas de verrou à gérer.

## 5. Idempotence

- **Decision**: l'achat passe de `pending` à son état final par
  `Purchase.findOneAndUpdate({ _id, status: "pending" }, …)` : un événement rejoué trouve l'achat déjà
  traité et ne fait rien ; on répond 200 à Stripe dans tous les cas traités.
- **Rationale**: Stripe peut renvoyer le même événement plusieurs fois (FR-006).

## 6. Lancement d'un achat

- **Decision**: `POST /api/purchases { listingId }` (connecté) vérifie : annonce `available`, pas la sienne,
  catégorie ≠ `immobilier` / `vehicules`, `priceCents ≤ 1 000 000` (10 000 €). Si l'acheteur a déjà un achat
  `pending` non expiré pour cette annonce, on renvoie la même URL de session ; sinon on crée l'achat
  (prix figé lu en base) puis la session, et on renvoie `{ url }` (201).
- **Rationale**: FR-001, FR-003 et cas limite « double clic ».

## 7. Expiration et abandon

- **Decision**: `checkout.session.expired` → achat `expired` ; l'annonce n'a jamais été touchée. Annulation
  sur la page Stripe = simple retour sur `cancel_url`, l'achat reste `pending` jusqu'à expiration.
- **Rationale**: FR-007 ; aucune action requise sur Occaz pour un abandon.

## 8. Vente en ligne définitive

- **Decision**: si `soldOnline` est présent, `PATCH` de l'annonce refuse `status: "available"` (400,
  « Annonce vendue en ligne : elle ne peut pas être remise en vente ») ; la suppression reste possible.
- **Rationale**: cas limite de la spec ; évite de revendre un objet déjà payé.

## 9. Tests sans réseau

- **Decision**: `gateway.ts` exporte un objet `{ createCheckout, refund }` ; les tests remplacent ses
  méthodes (`jest.spyOn`) et enregistrent les appels. Les webhooks de test sont signés avec
  `stripe.webhooks.generateTestHeaderString({ payload, secret })` pour passer par la vraie vérification.
- **Rationale**: tests déterministes (constitution V) ; on teste quand même la signature réelle.

## 10. Démo en local

- **Decision**: `stripe login` puis `stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook` ; la CLI
  affiche le `whsec_…` à mettre dans `backend/.env`. Cartes de test : `4242 4242 4242 4242` (acceptée),
  `4000 0000 0000 0002` (refusée), date future, CVC quelconque.
- **Rationale**: Stripe doit pouvoir joindre le webhook ; la CLI le fait sans exposer le serveur.
