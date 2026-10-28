# Feature Specification: Favoris liés au compte

**Feature Branch**: `002-favoris`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Favoris liés au compte (bonus après le MVP Occaz). Un utilisateur connecté peut ajouter ou retirer une annonce disponible de ses favoris depuis les cartes de la vitrine et depuis le détail public, et retrouver tous ses favoris sur une page « Favoris » accessible depuis l'en-tête. Les favoris sont enregistrés côté serveur et suivent le compte sur tous les appareils ; à la première connexion, les favoris déjà présents dans le navigateur sont repris dans le compte. Une annonce vendue reste visible comme « plus disponible », une annonce supprimée disparaît. Chacun ne voit et ne modifie que ses propres favoris. Un visiteur non connecté qui clique sur le cœur est invité à se connecter."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mettre une annonce en favori (Priority: P1)

Un acheteur connecté repère une annonce dans la vitrine ou sur son détail public et clique sur le cœur
pour la garder de côté ; un second clic la retire. Le cœur reflète toujours l'état réel.

**Why this priority**: c'est le geste de base ; sans lui, la page Favoris n'a rien à afficher.

**Independent Test**: connecté, mettre une annonce en favori depuis la vitrine, recharger la page,
puis se connecter sur un autre navigateur avec le même compte : le cœur est plein dans les deux cas.

**Acceptance Scenarios**:

1. **Given** un utilisateur connecté sur la vitrine, **When** il clique sur le cœur d'une annonce
   disponible, **Then** le cœur devient plein et l'annonce est ajoutée à ses favoris.
2. **Given** une annonce déjà en favori, **When** il clique à nouveau sur le cœur, **Then** le cœur se
   vide et l'annonce est retirée de ses favoris.
3. **Given** une annonce en favori, **When** l'utilisateur se connecte depuis un autre appareil,
   **Then** le cœur de cette annonce est déjà plein.
4. **Given** le détail public d'une annonce disponible, **When** l'utilisateur connecté clique sur
   « Ajouter aux favoris », **Then** le comportement est le même que depuis la vitrine.
5. **Given** l'utilisateur sur sa propre annonce, **When** il l'affiche, **Then** aucun cœur n'est
   proposé : on ne met pas sa propre annonce en favori.

---

### User Story 2 - Retrouver ses favoris (Priority: P1)

Un acheteur ouvre la page « Favoris » depuis l'en-tête et voit toutes les annonces qu'il a gardées, des
plus récemment ajoutées aux plus anciennes, avec leur prix et leur état.

**Why this priority**: c'est la raison d'être des favoris ; sans page, l'information est inutilisable.

**Independent Test**: mettre trois annonces en favori, en marquer une « vendue » côté vendeur et en
supprimer une autre ; la page Favoris montre l'annonce disponible, l'annonce vendue marquée
« plus disponible », et plus l'annonce supprimée.

**Acceptance Scenarios**:

1. **Given** un utilisateur sans favori, **When** il ouvre la page Favoris, **Then** il voit un message
   « Aucun favori » et un lien vers les annonces.
2. **Given** trois favoris ajoutés à des moments différents, **When** il ouvre la page Favoris,
   **Then** ils s'affichent du plus récemment ajouté au plus ancien.
3. **Given** un favori dont le vendeur a marqué l'annonce « vendue », **When** il ouvre la page
   Favoris, **Then** l'annonce reste affichée avec la mention « plus disponible » et peut être retirée.
4. **Given** un favori dont le vendeur a supprimé l'annonce, **When** il ouvre la page Favoris,
   **Then** l'annonce n'apparaît plus.
5. **Given** un favori disponible, **When** il clique dessus, **Then** il arrive sur le détail public.

---

### User Story 3 - Isolation des favoris (Priority: P1)

Les favoris sont personnels : un utilisateur ne peut ni voir ni modifier ceux d'un autre compte, même en
contournant l'interface.

**Why this priority**: même exigence de sécurité que l'isolation des annonces (constitution III).

**Independent Test**: A et B ont des favoris différents ; la liste de B ne contient que les siens, et
aucune requête de B ne peut lire ou retirer un favori de A.

**Acceptance Scenarios**:

1. **Given** A et B ont chacun des favoris, **When** B consulte ses favoris, **Then** il ne voit que
   les siens.
2. **Given** un utilisateur non connecté ou avec une session falsifiée, **When** il demande ou modifie
   des favoris, **Then** l'accès est refusé.
3. **Given** B, **When** il tente de retirer un favori qui appartient à A, **Then** il obtient
   « introuvable » et le favori de A est intact.

---

### User Story 4 - Reprendre les favoris du navigateur (Priority: P2)

Un visiteur a mis des annonces en favori avant de se connecter (favoris gardés dans son navigateur).
À sa connexion, ces favoris rejoignent son compte au lieu d'être perdus.

**Why this priority**: évite de perdre ce que le visiteur a déjà sélectionné ; utile mais pas
indispensable au fonctionnement.

**Independent Test**: déconnecté, mettre deux annonces en favori, se connecter : elles apparaissent
dans la page Favoris du compte, sans doublon avec les favoris existants.

**Acceptance Scenarios**:

1. **Given** deux favoris gardés dans le navigateur, **When** le visiteur se connecte, **Then** ils
   sont ajoutés à son compte et retirés du navigateur.
2. **Given** un favori du navigateur déjà présent dans le compte, **When** il se connecte, **Then**
   aucun doublon n'est créé.
3. **Given** un favori du navigateur dont l'annonce a été vendue ou supprimée entre-temps, **When** il
   se connecte, **Then** ce favori est ignoré sans bloquer la connexion.

---

### User Story 5 - Visiteur non connecté (Priority: P2)

Un visiteur non connecté clique sur un cœur : on lui propose de se connecter, puis il revient là où il
était.

**Why this priority**: transforme un geste d'intérêt en inscription ; complète US4.

**Independent Test**: déconnecté, cliquer sur un cœur dans la vitrine, se connecter, revenir sur la
vitrine avec l'annonce en favori.

**Acceptance Scenarios**:

1. **Given** un visiteur non connecté, **When** il clique sur un cœur, **Then** l'annonce est gardée
   dans son navigateur et un message l'invite à se connecter pour retrouver ses favoris partout.
2. **Given** ce visiteur, **When** il ouvre la page Favoris, **Then** il voit les favoris de son
   navigateur et une invitation à se connecter.

---

### Edge Cases

- Ajouter deux fois la même annonce : aucun doublon, la seconde demande ne change rien.
- Ajouter une annonce vendue, inexistante ou dont l'identifiant est mal formé : refusé (introuvable,
  ou entrée invalide pour un identifiant mal formé), comme pour la vitrine.
- Retirer un favori qui n'existe pas : « introuvable », sans effet de bord.
- Le vendeur remet en vente une annonce marquée « plus disponible » : elle redevient disponible dans
  les favoris.
- Un compte atteint 200 favoris : l'ajout suivant est refusé avec un message lisible.
- Session expirée pendant un clic sur le cœur : renvoi vers la connexion, comme ailleurs dans le site.
- Les favoris ne révèlent jamais l'email ni aucune donnée privée du vendeur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un utilisateur connecté MUST pouvoir ajouter à ses favoris une annonce disponible qui
  n'est pas la sienne, et la retirer.
- **FR-002**: L'ajout MUST être idempotent : une annonce figure au plus une fois dans les favoris d'un
  compte.
- **FR-003**: Le système MUST refuser l'ajout d'une annonce vendue, inexistante ou appartenant à
  l'utilisateur ; un identifiant mal formé est refusé comme entrée invalide.
- **FR-004**: Le système MUST permettre à un utilisateur connecté de lister ses favoris, du plus
  récemment ajouté au plus ancien, avec pour chacun les informations publiques de l'annonce
  (titre, prix, catégorie, ville, statut, date).
- **FR-005**: Un favori dont l'annonce est vendue MUST rester listé avec un état « plus disponible » ;
  un favori dont l'annonce est supprimée MUST disparaître de la liste.
- **FR-006**: Chaque utilisateur MUST ne voir et ne modifier que ses propres favoris ; toute tentative
  sur le favori d'un autre compte MUST répondre « introuvable », comme pour un favori inexistant.
- **FR-007**: Toute opération sur les favoris MUST exiger une session valide, sinon l'accès est refusé.
- **FR-008**: Le système MUST limiter un compte à 200 favoris et refuser au-delà avec un message lisible.
- **FR-009**: À la connexion, l'interface MUST transférer vers le compte les favoris gardés dans le
  navigateur, sans doublon, en ignorant ceux qui ne sont plus disponibles, puis vider ceux du
  navigateur.
- **FR-010**: L'interface MUST afficher un cœur sur les cartes de la vitrine, de la sélection
  « Petits prix » et sur le détail public, sauf sur les annonces de l'utilisateur lui-même.
- **FR-011**: L'interface MUST proposer une page « Favoris » accessible depuis l'en-tête, avec un état
  vide explicite et, pour un visiteur, une invitation à se connecter.
- **FR-012**: Le cœur MUST être utilisable au clavier, nommé pour les lecteurs d'écran (« Ajouter … aux
  favoris » / « Retirer … des favoris ») et indiquer son état.
- **FR-013**: Les réponses MUST respecter le Contrat API v1 : identifiant public `id`, jamais `_id`,
  format d'erreur `{"error":{"code","message"}}`, aucune donnée privée du vendeur.

### Key Entities

- **Favori**: lien entre un utilisateur et une annonce ; date d'ajout ; unique pour un couple
  (utilisateur, annonce) ; appartient à exactement un utilisateur.
- **Utilisateur** (existant) : possède de 0 à 200 favoris.
- **Annonce** (existante) : peut être en favori chez 0 à n utilisateurs ; sa suppression fait
  disparaître les favoris correspondants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur met une annonce en favori en un seul clic, et la retrouve dans sa page
  Favoris sur un autre appareil sans aucune action supplémentaire.
- **SC-002**: 100 % des tentatives d'un utilisateur B de lire ou retirer les favoris de A échouent,
  vérifié par tests automatisés.
- **SC-003**: 100 % des favoris gardés dans le navigateur avant connexion et encore disponibles se
  retrouvent dans le compte après connexion, sans doublon.
- **SC-004**: La page Favoris reflète l'état réel des annonces : 0 annonce supprimée affichée, 100 %
  des annonces vendues marquées « plus disponible ».
- **SC-005**: L'ajout et le retrait d'un favori sont réalisables au clavier seul, sur un écran de
  375 px.

## Assumptions

- Bonus réalisé après le MVP (US1–US4 terminées) ; il ne modifie pas les routes du Contrat API v1, il
  en ajoute.
- Les favoris en navigateur existants (`localStorage`) restent le mode « visiteur » et servent de
  source à la reprise (US4).
- Pas de notification au vendeur, pas de compteur public de favoris, pas d'alerte de baisse de prix.
- Limite de 200 favoris par compte : valeur par défaut raisonnable pour éviter les abus.
- On ne peut pas mettre sa propre annonce en favori (comme sur les sites de petites annonces courants).
