Quel pb je vais régler ?
x

Qui est la cible a qui je vais "vendre" cet outil ?

Particulier et professionnel

Définir une identité visuelle / branding / naming

Nom : Occaz
IV :

- Logo : le mot « Occaz » en gras, avec une petite étiquette de prix 🏷️ comme icône
- Couleurs :
  - principale : orange #C2410C (chaleureux, évoque les bonnes affaires)
  - texte : bleu nuit #1E293B, fond : blanc cassé #F8FAFC
  - vert #15803D = disponible, gris = vendue, rouge #B91C1C = erreur / suppression
- Police : Inter (gratuite, très lisible sur mobile)
- Style : épuré, cartes à coins arrondis, beaucoup d'espace, contrastes accessibles

Branding :

- Slogan : « Vos objets ont encore de la valeur. »
- Promesse : publier une annonce en moins de 2 minutes
- Valeurs : simplicité, confiance, seconde vie des objets
- Ton : simple, direct

Définir une liste de fonctio a implémenter avec ordre de priorités

P1 — MVP obligatoire

1. Comptes : inscription, connexion, déconnexion (email + mot de passe ≥ 8 caractères, JWT)
2. Mes annonces : publier, lister, consulter, modifier (ex. baisser le prix, marquer « vendue »), supprimer avec confirmation
   Annonce = titre, description, prix (en centimes, affiché en €), catégorie, ville, statut disponible/vendue
3. Isolation des comptes : un vendeur ne peut ni voir, ni modifier, ni supprimer les annonces d'un autre (404)

   P2 — Extension

4. Vitrine publique : parcourir les annonces disponibles de tous les vendeurs, filtres catégorie / ville / mot-clé / prix, détail sans données privées du vendeur

   P3 — Bonus

5. Messagerie : contacter le vendeur depuis une annonce, le vendeur voit ses messages reçus
   Hors périmètre : photos, paiement, livraison, modération, mot de passe oublié, compte admin

Répartission des taches :

1. Brainstorm (MAP projet : problème, cible, identité, priorités) / Ismael
2. Fondations + design system / Nicolas
3. US1 Comptes / Kelyan
4. US2 Mes annonces / Ismael
5. US3 Isolation / Nicolas
6. US4 Vitrine / Kelyan
7. US5 Messagerie / Ismael
8. Finitions / Nicolas
