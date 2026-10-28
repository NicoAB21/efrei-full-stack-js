# Quickstart: valider le paiement de démonstration

Contrat : [contracts/purchases.openapi.yaml](./contracts/purchases.openapi.yaml) · règles :
[data-model.md](./data-model.md) · choix : [research.md](./research.md).

## Prérequis

1. Compte Stripe (gratuit), **mode test** activé.
2. Clé secrète de test (`sk_test_…`) dans `backend/.env` : `STRIPE_SECRET_KEY=sk_test_…`
   et `FRONT_URL=http://localhost:5173`. Jamais dans git (`.env` est ignoré).
3. Stripe CLI : `stripe login`, puis dans un terminal à part :
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copier le `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET`, puis relancer l'API.
4. Sans ces variables, le site fonctionne mais le bouton « Acheter » n'apparaît pas.

## Automatique (sans réseau ni compte Stripe)

```bash
cd backend && npm run lint && npm run build && npm test
```

Les tests doivent couvrir : lancement (201 + URL), sa propre annonce / Immobilier / > 10 000 € → 400,
annonce vendue → 404, sans token → 401 ; double clic → même session ; webhook signé
`completed` → annonce vendue + achat confirmé ; **deux paiements confirmés → 1 vente + 1 remboursement** ;
webhook à signature invalide → 400 et rien ne change ; événement rejoué → aucun effet ; `expired` →
achat expiré, annonce disponible ; « Mes achats » isolé (C ne voit rien) ; démarrage refusé avec `sk_live_`.

## Démo navigateur

1. Compte B sur l'annonce de A : bouton « Acheter (démo) » et bandeau « Paiement de démonstration,
   aucun débit réel ».
2. Payer avec `4242 4242 4242 4242`, date future, CVC quelconque : retour sur « Mes achats », achat
   confirmé ; l'annonce a quitté la vitrine ; A voit « Vendue en ligne le … pour 85,00 € ».
3. Recommencer avec `4000 0000 0000 0002` : refus affiché par Stripe, annonce toujours disponible.
4. Annuler sur la page Stripe : retour sur l'annonce, « Paiement annulé ».
5. Deux navigateurs (B et C) lancent l'achat de la même annonce et paient : une seule vente, l'autre achat
   « Annonce déjà vendue, remboursé ».
6. Vérifier dans le tableau de bord Stripe (mode test) : paiement + remboursement.
