# Feature Specification: Communes fiables

**Feature Branch**: `004-communes-fiables`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Communes fiables pour la localisation des annonces (bonus après le MVP Occaz). Aujourd'hui la ville est un texte libre : on peut écrire n'importe quoi (« Lyonnn ») et « lyon » / « Lyon » comptent comme deux villes. À la place, le vendeur choisit sa commune dans une liste de suggestions des communes françaises officielles (nom + code postal), en tapant les premières lettres ou le code postal ; le serveur refuse toute commune qui n'existe pas. Pas d'adresse précise. La recherche par ville et les puces « Près de chez vous » utilisent les communes normalisées. Les annonces existantes restent affichables et sont rattachées à une commune quand c'est possible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choisir sa commune en publiant (Priority: P1)

Un vendeur qui publie ou modifie une annonce tape les premières lettres de sa commune ou son code
postal, et choisit parmi des suggestions officielles (« Lyon (69003) »).

**Why this priority**: c'est ce qui garantit des localisations justes et comparables ; le reste en dépend.

**Independent Test**: dans le formulaire, taper « lyo », choisir « Lyon (69003) », publier ; l'annonce
affiche « Lyon (69003) ». Taper « 69003 » propose aussi Lyon.

**Acceptance Scenarios**:

1. **Given** le champ commune du formulaire, **When** le vendeur tape au moins 2 lettres, **Then** des
   suggestions de communes officielles s'affichent avec leur code postal, les plus pertinentes d'abord.
2. **Given** le champ commune, **When** il tape un code postal complet, **Then** les communes de ce code
   postal sont proposées.
3. **Given** une suggestion, **When** il la choisit (souris, toucher ou clavier), **Then** la commune et
   son code postal sont retenus et affichés dans le champ.
4. **Given** un texte tapé sans choisir de suggestion, **When** il publie, **Then** la publication est
   refusée avec le message « Choisissez une commune dans la liste ».
5. **Given** une commune qui a plusieurs codes postaux (ex. Lyon), **When** il cherche, **Then** chaque
   code postal est proposé séparément et il choisit le sien.

---

### User Story 2 - Le serveur refuse les communes inventées (Priority: P1)

Même en contournant l'interface, il est impossible d'enregistrer une annonce dans une commune qui
n'existe pas ou avec un code postal qui ne lui correspond pas.

**Why this priority**: la validation côté serveur est obligatoire (constitution IV) ; sans elle, la
liste de suggestions ne protège rien.

**Independent Test**: envoyer directement à l'API une annonce avec « Lyonnn », puis avec Lyon et le code
postal 75001 : les deux sont refusées comme entrée invalide.

**Acceptance Scenarios**:

1. **Given** une commune inexistante, **When** une annonce est créée ou modifiée avec elle, **Then**
   elle est refusée comme entrée invalide.
2. **Given** une commune existante associée à un code postal qui n'est pas le sien, **When** l'annonce
   est envoyée, **Then** elle est refusée comme entrée invalide.
3. **Given** une commune et un code postal cohérents, **When** l'annonce est envoyée, **Then** elle est
   acceptée et le nom officiel de la commune est enregistré (majuscules et accents corrects), quelle que
   soit la façon dont il a été tapé.

---

### User Story 3 - Chercher par commune (Priority: P2)

Un visiteur filtre la vitrine par commune et retrouve toutes les annonces de cette commune, quelle que
soit la façon dont son nom est écrit dans la recherche.

**Why this priority**: tire le bénéfice des données normalisées pour l'acheteur.

**Independent Test**: avec des annonces à Lyon 69001 et Lyon 69003, chercher « lyon » renvoie les deux ;
les puces « Près de chez vous » montrent une seule puce « Lyon » avec le bon total.

**Acceptance Scenarios**:

1. **Given** des annonces dans plusieurs codes postaux de Lyon, **When** le visiteur filtre sur la
   commune Lyon, **Then** toutes ces annonces sont renvoyées.
2. **Given** une recherche « saint-etienne » ou « Saint Étienne », **When** il lance la recherche,
   **Then** les annonces de Saint-Étienne sont trouvées (accents, tirets et casse ignorés).
3. **Given** la section « Près de chez vous », **When** elle s'affiche, **Then** chaque commune apparaît
   une seule fois avec son nombre d'annonces.
4. **Given** le champ ville de la recherche de la vitrine, **When** le visiteur tape, **Then** les mêmes
   suggestions de communes lui sont proposées.

---

### User Story 4 - Annonces existantes en texte libre (Priority: P2)

Les annonces publiées avant ce changement restent visibles ; celles dont la ville correspond sans
ambiguïté à une commune y sont rattachées, les autres gardent leur texte jusqu'à leur prochaine
modification.

**Why this priority**: ne rien casser pour les annonces déjà en ligne.

**Independent Test**: une annonce « lyon » existante est rattachée à Lyon ; une annonce « Lyonnn » reste
affichée avec son texte et, à la modification, le vendeur doit choisir une commune.

**Acceptance Scenarios**:

1. **Given** une annonce existante « lyon », **When** le rattachement est appliqué, **Then** elle est
   rattachée à la commune Lyon et apparaît dans la recherche par commune.
2. **Given** une annonce existante « Saint-Denis » (plusieurs communes portent ce nom), **When** le
   rattachement est appliqué, **Then** elle n'est pas rattachée et garde son texte.
3. **Given** une annonce non rattachée, **When** son propriétaire la modifie, **Then** il doit choisir
   une commune dans la liste pour enregistrer.
4. **Given** une annonce non rattachée, **When** elle est affichée, **Then** sa ville en texte s'affiche
   comme aujourd'hui.

---

### Edge Cases

- Communes d'outre-mer (ex. Saint-Denis de La Réunion, code postal 97400) : proposées comme les autres.
- Communes homonymes (plusieurs « Saint-Denis ») : distinguées par le code postal et le département
  dans les suggestions.
- Paris, Lyon, Marseille : une seule commune par ville, un code postal par arrondissement.
- Saisie d'une seule lettre : aucune suggestion, message « Tapez au moins 2 caractères ».
- Aucune suggestion trouvée : message « Aucune commune ne correspond ».
- Service de suggestions indisponible : le vendeur en est informé et ne peut pas publier avec une
  commune non vérifiée ; il réessaie plus tard (pas de retour au texte libre).
- Commune fusionnée ou renommée après publication : l'annonce garde la commune enregistrée.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le formulaire d'annonce MUST proposer, dès 2 caractères saisis (nom ou code postal), des
  suggestions de communes françaises officielles (métropole et outre-mer), chacune avec son code postal
  et son département.
- **FR-002**: Une annonce créée ou modifiée MUST être rattachée à une commune officielle et à l'un de ses
  codes postaux ; toute autre valeur MUST être refusée comme entrée invalide par le serveur, y compris
  hors interface.
- **FR-003**: Le système MUST enregistrer le nom officiel de la commune, indépendamment de la casse et
  des accents saisis.
- **FR-004**: Le système MUST NOT demander ni stocker d'adresse plus précise que la commune et le code
  postal.
- **FR-005**: Le filtre par ville de la vitrine MUST renvoyer toutes les annonces disponibles d'une
  commune, tous codes postaux confondus, en ignorant casse, accents et tirets.
- **FR-006**: La section « Près de chez vous » MUST regrouper les annonces par commune officielle, une
  puce par commune.
- **FR-007**: Les annonces existantes dont la ville correspond à une seule commune (casse, accents et
  tirets ignorés) MUST y être rattachées ; les autres MUST rester affichées avec leur texte d'origine.
- **FR-008**: La modification d'une annonce non rattachée MUST exiger le choix d'une commune.
- **FR-009**: Les suggestions MUST être utilisables au clavier (flèches pour naviguer, Entrée pour
  choisir, Échap pour fermer) et annoncées aux lecteurs d'écran.
- **FR-010**: L'affichage d'une annonce MUST montrer « Commune (code postal) » ; les cartes peuvent
  n'afficher que le nom de la commune.
- **FR-011**: Les réponses MUST respecter le Contrat API v1 (format d'erreur, codes, identifiant public) ;
  les routes existantes restent compatibles, la ville restant lisible sous forme de texte.

### Key Entities

- **Commune** (référentiel officiel, en lecture seule) : code officiel unique, nom officiel, codes
  postaux, département.
- **Annonce** (existante) : rattachée à 0 ou 1 commune (0 seulement pour les annonces anciennes non
  rattachées) et à un code postal de cette commune ; conserve un libellé de ville affichable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des annonces publiées après ce changement sont rattachées à une commune officielle.
- **SC-002**: 100 % des tentatives d'enregistrer une commune inexistante ou un code postal incohérent
  sont refusées, vérifié par tests automatisés.
- **SC-003**: Un vendeur trouve et choisit sa commune en moins de 10 secondes, en tapant 3 lettres ou
  son code postal.
- **SC-004**: Une recherche sur une commune renvoie 100 % de ses annonces disponibles, quelle que soit
  l'écriture du nom (casse, accents, tirets).
- **SC-005**: 0 annonce existante ne disparaît de la vitrine à cause du changement.

## Assumptions

- Bonus réalisé après le MVP ; il modifie la saisie de la ville (US2) et le filtre de la vitrine (US4).
- Le référentiel officiel des communes françaises (nom, code officiel, codes postaux) est disponible
  librement ; le plan choisira comment l'obtenir et le tenir à jour, en évitant que les tests dépendent
  d'Internet.
- Seules les communes françaises sont concernées (Occaz cible la France).
- Pas de recherche par distance (« à moins de 10 km ») : hors périmètre.
- Le rattachement des annonces existantes est fait une fois, au déploiement de la fonctionnalité.
