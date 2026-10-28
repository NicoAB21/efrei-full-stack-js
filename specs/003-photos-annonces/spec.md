# Feature Specification: Photos des annonces

**Feature Branch**: `003-photos-annonces`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Photos des annonces (bonus après le MVP Occaz). Un vendeur connecté peut ajouter de 1 à 5 photos à son annonce lors de la publication ou de la modification, choisir la photo principale (couverture), réordonner et supprimer ses photos. La photo principale s'affiche sur les cartes à la place du pictogramme de catégorie, et le détail affiche toutes les photos en galerie. JPEG, PNG et WebP uniquement, vérifiés sur le contenu réel, jamais de SVG ; 5 Mo maximum ; seul le propriétaire gère ses photos (404 sinon) ; les photos d'une annonce supprimée sont supprimées. Une annonce sans photo reste valide. Métadonnées de localisation retirées."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ajouter des photos à son annonce (Priority: P1)

Un vendeur connecté ajoute jusqu'à 5 photos à son annonce, à la publication ou plus tard en la
modifiant. Il voit un aperçu de chaque photo avant d'enregistrer.

**Why this priority**: une annonce avec photo inspire confiance et se vend mieux ; c'est le cœur du bonus.

**Independent Test**: publier une annonce avec 2 photos, vérifier qu'elles apparaissent sur le
détail et que la première apparaît sur la carte de la vitrine.

**Acceptance Scenarios**:

1. **Given** un vendeur qui publie une annonce, **When** il sélectionne 2 photos JPEG de moins de 5 Mo
   et valide, **Then** l'annonce est publiée avec ses 2 photos, la première étant la photo principale.
2. **Given** une annonce existante avec 1 photo, **When** son propriétaire en ajoute 2, **Then**
   l'annonce compte 3 photos.
3. **Given** une annonce qui a déjà 5 photos, **When** le propriétaire tente d'en ajouter une
   sixième, **Then** l'ajout est refusé avec un message lisible.
4. **Given** un vendeur qui publie sans photo, **When** il valide, **Then** l'annonce est publiée
   normalement et affiche le pictogramme de sa catégorie.
5. **Given** un fichier sélectionné, **When** il apparaît dans le formulaire, **Then** un aperçu est
   affiché avec un bouton pour le retirer avant l'envoi.

---

### User Story 2 - Voir les photos (Priority: P1)

Un visiteur voit la photo principale de chaque annonce sur les cartes, et toutes les photos sur le
détail, en galerie.

**Why this priority**: sans affichage, l'ajout de photos n'a aucune valeur pour l'acheteur.

**Independent Test**: une annonce avec 3 photos montre la photo principale sur sa carte dans la
vitrine, « Petits prix » et « Mes annonces », et les 3 photos sur le détail public.

**Acceptance Scenarios**:

1. **Given** une annonce avec photos, **When** elle apparaît sur une carte (vitrine, « Petits prix »,
   « Mes annonces »), **Then** la carte affiche sa photo principale, recadrée sans déformation.
2. **Given** le détail d'une annonce avec 3 photos, **When** le visiteur l'ouvre, **Then** il voit la
   photo principale en grand et peut passer aux autres, à la souris comme au clavier.
3. **Given** une annonce vendue avec photos, **When** son propriétaire l'affiche, **Then** les photos
   restent visibles (en grisé sur la carte, comme aujourd'hui).
4. **Given** une photo, **When** un lecteur d'écran la rencontre, **Then** elle est décrite par le
   titre de l'annonce et son numéro (« Vélo de ville, photo 2 sur 3 »).

---

### User Story 3 - Organiser ses photos (Priority: P2)

Le propriétaire choisit la photo principale, change l'ordre et supprime des photos.

**Why this priority**: améliore la présentation, mais une annonce est déjà utilisable sans.

**Independent Test**: sur une annonce de 3 photos, définir la troisième comme principale, puis
supprimer la première ; la carte affiche la nouvelle photo principale et le détail 2 photos.

**Acceptance Scenarios**:

1. **Given** une annonce de 3 photos, **When** le propriétaire désigne la troisième comme principale,
   **Then** elle passe en première position et s'affiche sur la carte.
2. **Given** une annonce de 3 photos, **When** le propriétaire supprime la photo principale, **Then**
   la photo suivante devient principale.
3. **Given** une annonce, **When** le propriétaire supprime toutes ses photos, **Then** l'annonce
   reste publiée et retrouve le pictogramme de sa catégorie.
4. **Given** l'ordre des photos, **When** le propriétaire déplace une photo vers la gauche ou la
   droite, **Then** l'ordre est enregistré, y compris au clavier.

---

### User Story 4 - Sécurité et isolation des photos (Priority: P1)

Les photos ne doivent ni permettre d'attaquer le site, ni révéler d'informations privées, ni être
modifiables par un autre compte.

**Why this priority**: l'envoi de fichiers est une surface d'attaque classique ; exigence de la
constitution (III, IV).

**Independent Test**: tenter d'envoyer un SVG, un fichier texte renommé en `.jpg`, une photo de 6 Mo,
et, avec le compte B, d'ajouter ou supprimer une photo sur l'annonce de A : tout est refusé, et
l'annonce de A est intacte.

**Acceptance Scenarios**:

1. **Given** un fichier SVG, GIF, PDF ou un fichier texte renommé en `.jpg`, **When** le propriétaire
   l'envoie, **Then** il est refusé comme entrée invalide, avec un message lisible.
2. **Given** une photo de plus de 5 Mo, **When** elle est envoyée, **Then** elle est refusée avec un
   message indiquant la taille maximale.
3. **Given** l'annonce de A, **When** B tente d'y ajouter, d'y réordonner ou d'en supprimer une photo,
   **Then** il obtient « introuvable », exactement comme pour une annonce inexistante.
4. **Given** une photo prise avec un téléphone contenant une position GPS, **When** elle est publiée,
   **Then** la photo diffusée ne contient plus cette position ni les autres métadonnées.
5. **Given** une annonce supprimée par son propriétaire, **When** on tente d'accéder à ses photos,
   **Then** elles ne sont plus disponibles.

---

### Edge Cases

- Envoi de plusieurs photos dont une invalide : les photos valides sont refusées aussi, l'annonce
  reste inchangée, et le message indique quelle photo pose problème.
- Photo très grande en pixels (ex. 8000 × 6000) mais sous 5 Mo : acceptée et affichée sans déformation.
- Photo en orientation portrait prise au téléphone : affichée dans le bon sens.
- Coupure pendant l'envoi : aucune photo à moitié enregistrée n'est rattachée à l'annonce.
- Annonce passée « vendue » : ses photos sont conservées ; elles quittent la vitrine avec l'annonce.
- Identifiant de photo mal formé : refusé comme entrée invalide.
- Tentative d'ajouter une photo sans être connecté : accès refusé.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le propriétaire d'une annonce MUST pouvoir lui associer de 0 à 5 photos, à la
  publication comme à la modification.
- **FR-002**: Le système MUST accepter uniquement les formats JPEG, PNG et WebP, déterminés par le
  contenu réel du fichier et non par son nom ou le type déclaré ; tout autre format (dont SVG) MUST
  être refusé comme entrée invalide.
- **FR-003**: Le système MUST refuser toute photo de plus de 5 Mo et tout ajout au-delà de 5 photos par
  annonce, avec un message lisible.
- **FR-004**: Le système MUST retirer des photos diffusées toutes les métadonnées (position GPS, appareil,
  date de prise de vue) et respecter leur orientation.
- **FR-005**: Seul le propriétaire MUST pouvoir ajouter, réordonner, choisir la photo principale ou
  supprimer des photos ; toute tentative d'un autre compte MUST répondre « introuvable », comme pour
  une annonce inexistante ; sans session valide, l'accès MUST être refusé.
- **FR-006**: La première photo d'une annonce MUST être sa photo principale ; le propriétaire MUST
  pouvoir changer la photo principale et l'ordre des photos.
- **FR-007**: La suppression d'une annonce MUST supprimer définitivement ses photos ; la suppression
  d'une photo MUST la rendre inaccessible.
- **FR-008**: Les adresses des photos MUST être non devinables, et aucune liste de toutes les photos
  ne MUST être accessible.
- **FR-009**: Les cartes (vitrine, « Petits prix », « Mes annonces ») MUST afficher la photo principale
  recadrée ; sans photo, le pictogramme de la catégorie.
- **FR-010**: Le détail (public et propriétaire) MUST afficher toutes les photos dans l'ordre, avec une
  navigation utilisable à la souris, au toucher et au clavier.
- **FR-011**: Chaque photo affichée MUST avoir un texte alternatif dérivé du titre de l'annonce et de
  sa position (« titre, photo N sur M »).
- **FR-012**: Un envoi contenant au moins une photo invalide MUST être refusé en entier, sans modifier
  l'annonce.
- **FR-013**: Les réponses MUST respecter le Contrat API v1 (identifiant public `id`, format d'erreur
  `{"error":{"code","message"}}`) ; les routes existantes de l'annonce gardent leur comportement.

### Key Entities

- **Photo**: image rattachée à exactement une annonce ; position dans l'annonce (la position 1 est la
  photo principale) ; format ; taille ; date d'ajout ; adresse de diffusion non devinable.
- **Annonce** (existante) : possède de 0 à 5 photos ordonnées ; sa suppression supprime ses photos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un vendeur publie une annonce avec 3 photos en moins de 3 minutes depuis son téléphone.
- **SC-002**: 100 % des fichiers non autorisés (SVG, GIF, PDF, texte renommé, plus de 5 Mo) sont
  refusés, vérifié par tests automatisés.
- **SC-003**: 100 % des tentatives d'un compte B sur les photos de l'annonce de A échouent, vérifié par
  tests automatisés.
- **SC-004**: 0 photo diffusée ne contient de position GPS, vérifié sur une photo de test qui en
  contient une.
- **SC-005**: La vitrine avec 20 annonces illustrées reste agréable à parcourir sur mobile : les photos
  des cartes visibles s'affichent en moins de 2 secondes sur une connexion 4G.
- **SC-006**: Après suppression d'une annonce, 0 de ses photos reste accessible.

## Assumptions

- Bonus réalisé après le MVP ; dépend des annonces (US2) et réutilise la règle d'isolation de US3.
- Les photos sont stockées par l'application elle-même (pas de service externe imposé) ; le choix
  technique relève du plan.
- Une version réduite de chaque photo peut être produite pour les cartes afin de tenir SC-005.
- Pas de retouche (rognage, filtres) ni de vidéo.
- Pas de modération automatique du contenu des images (hors périmètre du module).
- Les favoris (spec 002) affichent aussi la photo principale une fois cette spec réalisée.
