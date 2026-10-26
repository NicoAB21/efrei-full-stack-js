# Feature Specification: Occaz — MVP de petites annonces entre particuliers

**Feature Branch**: `001-marketplace-mvp`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Un site de vente entre particuliers sur le principe de Leboncoin,
respectant la stack et les exigences transversales du livret étudiant Full Stack JS (TypeScript
au lieu de JavaScript), avec un sujet libre à la place du catalogue imposé."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Créer un compte et se connecter (Priority: P1)

Un particulier crée un compte avec son email et un mot de passe, puis se connecte. Une fois
connecté, il reste connecté pendant sa navigation et peut se déconnecter.

**Why this priority**: sans compte, impossible de publier ou de gérer ses annonces ; c'est la base
de l'isolation des données.

**Independent Test**: créer un compte, se déconnecter, se reconnecter ; vérifier qu'un mauvais
mot de passe est refusé sans indiquer lequel des deux champs est faux.

**Acceptance Scenarios**:

1. **Given** un visiteur, **When** il s'inscrit avec un email valide et un mot de passe de
   8 caractères ou plus, **Then** son compte est créé et il est connecté.
2. **Given** un compte existant `Alice@Example.test`, **When** quelqu'un s'inscrit avec
   `alice@example.test`, **Then** l'inscription est refusée (email déjà utilisé).
3. **Given** un compte existant, **When** l'utilisateur se connecte avec un mauvais mot de passe,
   **Then** la connexion est refusée avec un message neutre.
4. **Given** un mot de passe de 7 caractères ou un email invalide, **When** l'utilisateur
   s'inscrit, **Then** l'inscription est refusée avec un message lisible.

---

### User Story 2 - Gérer ses propres annonces (Priority: P1)

Un vendeur connecté publie une annonce (titre, description, prix, catégorie, ville), voit la liste
de ses annonces, en consulte le détail, la modifie (par exemple pour baisser le prix ou la marquer
« vendue ») et la supprime après confirmation.

**Why this priority**: c'est le cœur du produit et le CRUD exigé par le module.

**Independent Test**: avec un compte, créer une annonce, la voir dans « Mes annonces », la
modifier, la supprimer, puis vérifier qu'elle n'existe plus ; redémarrer le serveur et vérifier
qu'une annonce non supprimée est toujours là.

**Acceptance Scenarios**:

1. **Given** un vendeur connecté sans annonce, **When** il ouvre « Mes annonces », **Then** il
   voit une liste vide avec une invitation à publier.
2. **Given** un vendeur connecté, **When** il publie « Vélo de ville », 85,00 €, catégorie
   Loisirs, Lyon, **Then** l'annonce apparaît dans sa liste avec le prix affiché `85,00 €`.
3. **Given** une annonce du vendeur, **When** il modifie uniquement son prix, **Then** seul le
   prix change.
4. **Given** une annonce du vendeur, **When** il la marque « vendue », **Then** son statut change
   et elle n'est plus proposée aux acheteurs.
5. **Given** une annonce du vendeur, **When** il la supprime et confirme, **Then** elle disparaît
   et n'est plus consultable.
6. **Given** un titre vide, un prix nul, négatif ou non entier en centimes, ou une catégorie
   inconnue, **When** le vendeur valide, **Then** l'annonce est refusée avec un message lisible.

---

### User Story 3 - Isolation entre deux vendeurs (Priority: P1)

Deux vendeurs A et B utilisent le site. B ne peut ni voir dans sa gestion, ni modifier, ni
supprimer les annonces de A, même en contournant l'interface.

**Why this priority**: exigence de sécurité évaluée (isolation A/B) ; un défaut ici est bloquant.

**Independent Test**: créer A et B, une annonce chacun ; vérifier que la liste de B ne contient
que la sienne et que toute tentative de B sur l'annonce de A répond « introuvable ».

**Acceptance Scenarios**:

1. **Given** A et B ont chacun une annonce, **When** B ouvre « Mes annonces », **Then** il ne voit
   que la sienne.
2. **Given** l'identifiant d'une annonce de A, **When** B tente de la consulter dans sa gestion,
   la modifier ou la supprimer, **Then** il obtient « introuvable », exactement comme pour une
   annonce inexistante.
3. **Given** un utilisateur non connecté ou avec une session falsifiée, **When** il accède à la
   gestion des annonces, **Then** l'accès est refusé.
4. **Given** un vendeur, **When** il tente d'imposer l'identifiant ou le propriétaire d'une
   annonce, **Then** la demande est refusée.

---

### User Story 4 - Parcourir et rechercher les annonces publiées (Priority: P2)

Un visiteur, connecté ou non, parcourt les annonces disponibles de tous les vendeurs, les filtre
par catégorie, ville, mot-clé et fourchette de prix, et consulte le détail d'une annonce.

**Why this priority**: c'est ce qui fait un « Leboncoin », mais le module exige d'abord le CRUD
privé ; cette vitrine publique est donc une extension, à réaliser une fois P1 terminé et testé.

**Independent Test**: avec deux vendeurs ayant publié des annonces, un visiteur non connecté
voit toutes les annonces disponibles (pas les vendues), filtre par catégorie et ouvre un détail
sans voir l'email du vendeur.

**Acceptance Scenarios**:

1. **Given** des annonces disponibles et vendues, **When** un visiteur ouvre l'accueil, **Then**
   il voit uniquement les annonces disponibles, les plus récentes d'abord.
2. **Given** des annonces de plusieurs catégories, **When** il filtre sur « Multimédia »,
   **Then** seules les annonces de cette catégorie s'affichent.
3. **Given** une recherche par mot-clé « vélo » et un prix maximum de 100 €, **When** il lance la
   recherche, **Then** seules les annonces correspondantes s'affichent.
4. **Given** le détail d'une annonce, **When** un visiteur la consulte, **Then** il voit titre,
   description, prix, catégorie, ville et date, mais aucune donnée privée du vendeur.

---

### User Story 5 - Contacter le vendeur (Priority: P3)

Un acheteur connecté envoie un message au vendeur depuis le détail d'une annonce ; le vendeur
consulte les messages reçus par annonce.

**Why this priority**: complète l'expérience Leboncoin mais n'est pas exigé ; bonus de fin de
module seulement.

**Independent Test**: B envoie un message sur l'annonce de A ; A le voit ; un tiers C ne le voit pas.

**Acceptance Scenarios**:

1. **Given** B connecté sur l'annonce de A, **When** il envoie un message non vide, **Then** A le
   voit dans ses messages reçus.
2. **Given** un vendeur sur sa propre annonce, **When** il ouvre le détail, **Then** il ne peut pas
   s'envoyer de message.

---

### Edge Cases

- Prix énorme : un prix au-delà de l'entier sûr est refusé ; un prix de 1 centime est accepté.
- Modification vide (aucun champ) ou avec un champ inconnu : refusée.
- Identifiant d'annonce mal formé : refusé comme entrée invalide, distinct de « introuvable ».
- Titre composé uniquement d'espaces : refusé.
- Annonce supprimée puis consultée : « introuvable ».
- Session expirée pendant la navigation : l'utilisateur est renvoyé vers la connexion avec un message.
- Vitrine publique sans aucune annonce : message « aucune annonce » plutôt qu'une page vide.
- Affichage mobile : la liste et les formulaires restent utilisables sans défilement horizontal.

## Requirements *(mandatory)*

### Functional Requirements

**Comptes**

- **FR-001**: Le système MUST permettre l'inscription par email et mot de passe (8 caractères
  minimum), l'email étant comparé et stocké sans tenir compte de la casse.
- **FR-002**: Le système MUST refuser une inscription avec un email déjà utilisé, en le signalant.
- **FR-003**: Le système MUST authentifier l'utilisateur à la connexion et refuser une mauvaise
  combinaison sans révéler quel champ est faux.
- **FR-004**: Le système MUST ne jamais exposer de mot de passe, empreinte de mot de passe ou
  secret dans une réponse.

**Gestion de ses annonces (MVP obligatoire)**

- **FR-005**: Un vendeur connecté MUST pouvoir créer, lister, consulter, modifier partiellement et
  supprimer ses annonces.
- **FR-006**: Le système MUST rattacher chaque annonce à son créateur sans que le client puisse
  choisir ou modifier ce rattachement ni l'identifiant de l'annonce.
- **FR-007**: Le système MUST traiter toute annonce d'un autre vendeur comme inexistante dans la
  gestion (consultation, modification, suppression).
- **FR-008**: Le système MUST valider côté serveur : titre non vide après suppression des espaces,
  1 à 120 caractères ; description facultative de 0 à 2000 caractères ; prix en centimes, entier
  sûr strictement positif ; catégorie parmi une liste fermée ; ville non vide, 1 à 80 caractères ;
  statut parmi « disponible » et « vendue ».
- **FR-009**: Le système MUST refuser toute propriété inconnue, toute modification vide et tout
  identifiant mal formé.
- **FR-010**: Les annonces MUST persister après redémarrage du serveur.
- **FR-011**: L'interface MUST afficher les prix en euros (12345 centimes → `123,45 €`) et
  permettre la saisie en euros.
- **FR-012**: L'interface MUST demander confirmation avant suppression et afficher chargement,
  succès et erreurs de manière compréhensible.
- **FR-013**: L'interface MUST être utilisable sur mobile et au clavier (labels explicites,
  focus visible, boutons nommés).

**Vitrine publique (extension P2)**

- **FR-014**: Le système MUST permettre à tout visiteur de lister les annonces disponibles de tous
  les vendeurs, triées des plus récentes aux plus anciennes, avec filtres par catégorie, ville,
  mot-clé et fourchette de prix.
- **FR-015**: Le système MUST permettre à tout visiteur de consulter le détail d'une annonce
  disponible sans exposer l'email ni aucune donnée privée du vendeur.
- **FR-016**: La vitrine publique MUST s'ajouter à la gestion privée sans en modifier les règles.

**Messagerie (extension P3)**

- **FR-017**: Un utilisateur connecté MUST pouvoir envoyer un message au vendeur d'une annonce
  disponible qui n'est pas la sienne ; seuls l'expéditeur et le vendeur voient ce message.

### Key Entities

- **Utilisateur**: un particulier ; email unique (insensible à la casse), mot de passe protégé.
  Peut être vendeur et acheteur.
- **Annonce**: un objet à vendre ; titre, description, prix (centimes), catégorie, ville, statut
  (disponible / vendue), date de création et de mise à jour ; appartient à exactement un
  utilisateur.
- **Catégorie**: liste fermée : Véhicules, Immobilier, Multimédia, Maison, Mode, Loisirs, Autre.
- **Message** (P3): texte envoyé par un utilisateur au vendeur d'une annonce ; lié à l'annonce,
  à l'expéditeur et au destinataire.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un nouvel utilisateur crée son compte et publie sa première annonce en moins de
  2 minutes depuis le navigateur.
- **SC-002**: 100 % des tentatives d'un vendeur B sur les annonces de A (consultation,
  modification, suppression) échouent, vérifié par tests automatisés.
- **SC-003**: 100 % des entrées invalides listées dans les cas limites sont refusées avec un
  message lisible, vérifié par tests automatisés.
- **SC-004**: Après un redémarrage du serveur, 100 % des annonces non supprimées restent
  consultables par leur propriétaire.
- **SC-005**: Un développeur tiers installe et lance l'application en suivant uniquement le
  README, sans inventer de commande.
- **SC-006**: Le parcours complet (inscription → connexion → création → consultation →
  modification → suppression) est réalisable sur un écran de 375 px de large et au clavier seul.

## Assumptions

- Le sujet libre remplace le catalogue imposé ; la ressource métier est l'annonce (`listings`),
  soumise aux mêmes règles transversales que les ressources du livret (format d'erreur, codes,
  isolation, validation). À faire valider par le formateur si nécessaire.
- La gestion privée (« Mes annonces ») constitue le MVP évalué ; la vitrine publique est une
  extension car le contrat impose que la liste de gestion ne renvoie que les objets du compte.
- Pas de photos dans le MVP (upload d'images = bonus éventuel après P2).
- Pas de paiement, de livraison, de modération ni de réinitialisation de mot de passe.
- Montants fictifs en euros uniquement.
- Un seul rôle utilisateur ; pas d'administrateur.
- Le déploiement cloud dépend de la décision de l'établissement (non obligatoire à ce stade).
