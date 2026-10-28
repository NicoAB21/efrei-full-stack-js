# Feature Specification: Paiement de démonstration

**Feature Branch**: `005-paiement-demo`

**Created**: 2026-10-28

**Status**: Draft (bonus optionnel, à réaliser en dernier)

**Input**: User description: "Paiement en ligne de démonstration (bonus optionnel, à faire en dernier). Un acheteur connecté clique sur « Acheter » sur le détail public d'une annonce disponible qui n'est pas la sienne, paie sur la page sécurisée d'un prestataire reconnu (Stripe) en mode test uniquement, puis revient sur Occaz avec une confirmation. Une fois le paiement confirmé par le prestataire (et seulement par lui), l'annonce passe « vendue » et quitte la vitrine ; acheteur et vendeur voient la vente. Le premier paiement confirmé gagne, l'autre est remboursé. Un paiement abandonné ne change rien. Aucune donnée de carte chez Occaz. Mode démo clairement signalé. Hors périmètre : reversement au vendeur, livraison, frais, remboursement à la demande, factures. La spec 001 exclut le paiement : ce bonus l'ajoute en démonstration seulement."

> **Rappel de périmètre** : la spec [001](../001-marketplace-mvp/spec.md) exclut le paiement du MVP.
> Ce bonus ajoute un paiement **de démonstration** : aucun vrai argent ne circule, et le vendeur ne
> reçoit rien. Un vrai paiement entre particuliers demanderait que chaque vendeur ouvre un compte
> vérifié chez le prestataire, ce qui est hors périmètre du module.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acheter une annonce (Priority: P1)

Un acheteur connecté clique sur « Acheter » depuis le détail public, paie le prix affiché sur la page
sécurisée du prestataire avec une carte de test, et revient sur Occaz avec la confirmation de son achat.

**Why this priority**: c'est le parcours qui justifie le bonus.

**Independent Test**: avec une carte de test acceptée, acheter une annonce à 85,00 € ; revenir sur
Occaz voir « Achat confirmé », l'annonce marquée vendue et absente de la vitrine.

**Acceptance Scenarios**:

1. **Given** un acheteur connecté sur le détail d'une annonce disponible d'un autre vendeur, **When** il
   clique sur « Acheter », **Then** il est envoyé sur la page de paiement du prestataire, qui affiche le
   titre et le prix de l'annonce, et la mention qu'il s'agit d'un paiement de démonstration.
2. **Given** la page de paiement, **When** il paie avec une carte de test acceptée, **Then** il revient
   sur Occaz sur une page « Achat confirmé » ou « Paiement en cours de confirmation ».
3. **Given** un paiement confirmé par le prestataire, **When** la confirmation est reçue, **Then**
   l'annonce passe « vendue » et n'apparaît plus dans la vitrine.
4. **Given** un acheteur revenu sur Occaz sans que le prestataire ait confirmé le paiement, **When** il
   arrive sur la page de retour, **Then** l'annonce n'est pas marquée vendue et la page indique que la
   confirmation est en attente.
5. **Given** sa propre annonce, une annonce vendue ou un visiteur non connecté, **When** le détail
   s'affiche, **Then** le bouton « Acheter » n'est pas proposé (le visiteur est invité à se connecter).

---

### User Story 2 - Paiement refusé ou abandonné (Priority: P1)

Un acheteur annule sur la page de paiement, ferme l'onglet, ou utilise une carte refusée : rien ne change
sur Occaz.

**Why this priority**: un paiement non confirmé ne doit jamais vendre l'annonce.

**Independent Test**: lancer un achat puis annuler, puis réessayer avec une carte de test refusée :
l'annonce reste disponible dans la vitrine.

**Acceptance Scenarios**:

1. **Given** un achat lancé, **When** l'acheteur clique sur « Retour » / « Annuler » chez le prestataire,
   **Then** il revient sur le détail de l'annonce, toujours disponible, avec le message « Paiement annulé ».
2. **Given** une carte de test refusée, **When** l'acheteur tente de payer, **Then** le prestataire
   affiche le refus et l'annonce reste disponible.
3. **Given** un achat lancé puis abandonné, **When** le délai de validité de la page de paiement expire,
   **Then** aucune vente n'est enregistrée.

---

### User Story 3 - Une seule vente par annonce (Priority: P1)

Deux acheteurs paient la même annonce presque en même temps : seul le premier paiement confirmé
emporte l'annonce, l'autre acheteur est remboursé automatiquement et prévenu.

**Why this priority**: vendre deux fois le même objet est l'erreur la plus grave d'une place de marché.

**Independent Test**: deux comptes lancent l'achat de la même annonce et paient tous les deux ; une
seule vente est enregistrée, l'autre paiement apparaît remboursé chez le prestataire.

**Acceptance Scenarios**:

1. **Given** deux acheteurs qui paient la même annonce, **When** les deux paiements sont confirmés,
   **Then** une seule vente est enregistrée, au premier confirmé.
2. **Given** le paiement du second acheteur, **When** il est confirmé après la vente, **Then** il est
   remboursé automatiquement, et sa page « Mes achats » indique « Annonce déjà vendue, remboursé ».
3. **Given** une annonce dont le vendeur a modifié le prix ou qu'il a supprimée pendant un paiement,
   **When** le paiement est confirmé, **Then** l'acheteur paie le prix affiché au moment où il a cliqué
   sur « Acheter » ; si l'annonce n'existe plus ou n'est plus disponible, il est remboursé.

---

### User Story 4 - Voir ses achats et ses ventes (Priority: P2)

L'acheteur retrouve ses achats dans « Mes achats » ; le vendeur voit sur son annonce qu'elle a été
vendue en ligne, à quelle date et à quel prix.

**Why this priority**: donne une trace de la transaction ; utile, mais secondaire au paiement lui-même.

**Independent Test**: après un achat, l'acheteur voit l'annonce dans « Mes achats » ; le vendeur voit
« Vendue en ligne le … pour 85,00 € » sur son annonce ; un tiers ne voit rien.

**Acceptance Scenarios**:

1. **Given** un achat confirmé, **When** l'acheteur ouvre « Mes achats », **Then** il voit le titre, le
   prix payé, la date et l'état (confirmé, en attente, remboursé).
2. **Given** une annonce vendue en ligne, **When** le vendeur l'ouvre dans « Mes annonces », **Then** il
   voit « Vendue en ligne », la date et le prix, sans l'email de l'acheteur.
3. **Given** un utilisateur C, **When** il tente de consulter les achats de A ou B, **Then** il obtient
   « introuvable » (même règle d'isolation que pour les annonces).

---

### Edge Cases

- L'acheteur clique deux fois sur « Acheter » : une seule page de paiement active par acheteur et par
  annonce.
- Confirmation du prestataire reçue deux fois : la vente n'est enregistrée qu'une fois.
- Message de confirmation falsifié (qui ne vient pas du prestataire) : ignoré, aucune vente.
- Le vendeur remet en vente une annonce vendue en ligne : impossible, la vente en ligne est définitive
  dans la démo (le vendeur peut seulement la supprimer).
- Le prestataire est injoignable au clic sur « Acheter » : message « Paiement indisponible, réessayez
  plus tard », l'annonce reste disponible.
- Catégories Immobilier et Véhicules, ou prix supérieur à 10 000 € : pas de bouton « Acheter »
  (on n'achète pas un appartement par carte), l'annonce reste consultable.
- Session Occaz expirée au retour du prestataire : l'achat reste enregistré ; l'acheteur se reconnecte
  pour le voir.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un utilisateur connecté MUST pouvoir lancer l'achat d'une annonce disponible d'un autre
  vendeur depuis son détail public, sauf catégories Immobilier et Véhicules et prix supérieur à 10 000 €.
- **FR-002**: Le paiement MUST se faire sur la page du prestataire ; Occaz MUST NOT recevoir, afficher ni
  stocker de numéro de carte ou de cryptogramme.
- **FR-003**: Le montant payé MUST être le prix de l'annonce au moment du clic sur « Acheter », calculé
  par le serveur et non transmis par le navigateur.
- **FR-004**: Une annonce MUST passer « vendue » uniquement à réception d'une confirmation authentifiée
  du prestataire ; le retour du navigateur seul ne MUST rien valider.
- **FR-005**: Le système MUST garantir au plus une vente par annonce ; tout paiement confirmé pour une
  annonce déjà vendue, supprimée ou indisponible MUST être remboursé automatiquement.
- **FR-006**: Une même confirmation reçue plusieurs fois MUST produire une seule vente (traitement
  idempotent).
- **FR-007**: Un paiement annulé, refusé ou expiré MUST laisser l'annonce inchangée.
- **FR-008**: L'acheteur MUST voir ses achats (titre, prix payé, date, état : en attente, confirmé,
  remboursé) ; le vendeur MUST voir sur son annonce qu'elle a été vendue en ligne, à quelle date et à
  quel prix, sans donnée personnelle de l'acheteur.
- **FR-009**: Chacun MUST ne voir que ses propres achats ; toute tentative sur l'achat d'un autre compte
  MUST répondre « introuvable ».
- **FR-010**: ~~L'interface MUST signaler clairement le mode démonstration sur le bouton, la page de
  paiement et la confirmation.~~ **Retiré le 2026-10-28 à la demande de l'équipe** : l'interface se présente
  comme un vrai site. Le mode test reste garanti par le serveur (FR-011, clés `sk_live_` refusées) et la page
  Stripe affiche toujours le badge « Sandbox ».
- **FR-011**: Le système MUST fonctionner uniquement avec les identifiants de test du prestataire ; la
  configuration avec des identifiants réels MUST être refusée au démarrage.
- **FR-012**: Les secrets du prestataire MUST venir de variables d'environnement, jamais du dépôt.
- **FR-013**: Les réponses MUST respecter le Contrat API v1 (format d'erreur, codes, identifiant public).

### Key Entities

- **Achat**: lien entre un acheteur et une annonce ; prix figé au lancement ; état (en attente, confirmé,
  remboursé, annulé, expiré) ; dates de lancement et de confirmation ; référence du paiement chez le
  prestataire.
- **Annonce** (existante) : vendue en ligne au plus une fois ; garde la date et le prix de la vente.
- **Utilisateur** (existant) : peut avoir de 0 à n achats.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un acheteur réalise un achat de démonstration complet (clic, paiement, retour) en moins de
  1 minute avec une carte de test.
- **SC-002**: 0 annonce vendue deux fois, vérifié par un test de deux paiements confirmés simultanés.
- **SC-003**: 0 annonce marquée vendue sans confirmation authentifiée du prestataire, vérifié par un test
  avec une confirmation falsifiée.
- **SC-004**: 100 % des paiements en double sont remboursés automatiquement.
- **SC-005**: 0 donnée de carte bancaire présente dans les données, les journaux ou le dépôt d'Occaz.
- **SC-006**: ~~100 % des écrans du parcours d'achat affichent la mention « démonstration ».~~ Retiré avec FR-010.

## Assumptions

- Prestataire retenu : Stripe, en mode test (cartes de test, aucun débit réel) ; le choix technique
  précis relève du plan.
- Bonus optionnel, réalisé seulement après les specs 002 à 004 et la messagerie (US5), si le temps le
  permet.
- L'argent de démonstration reste chez le prestataire : pas de reversement au vendeur, pas de frais de
  service, pas de livraison, pas de facture, pas de remboursement à la demande de l'acheteur.
- La confirmation du prestataire doit pouvoir atteindre le serveur pendant la démonstration ; le plan
  prévoira comment le faire en local.
- Seuils par défaut : achat proposé jusqu'à 10 000 € et hors catégories Immobilier et Véhicules.
