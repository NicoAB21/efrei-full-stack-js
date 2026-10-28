# Research: Photos des annonces

## 1. Réception des fichiers

- **Decision**: `multer` 2.x en `memoryStorage`, `limits: { fileSize: 5 * 1024 * 1024, files: 5 }`,
  champ `photos`, uniquement sur `POST /api/listings/:id/photos`. Les `MulterError` deviennent
  `400 INVALID_INPUT` dans `errorHandler` (« Photo trop lourde : 5 Mo maximum », « 5 photos maximum »).
- **Rationale**: standard d'Express ; la mémoire évite d'écrire un fichier non vérifié sur disque ;
  5 × 5 Mo = 25 Mo maximum par requête.
- **Alternatives considered**: `busboy` direct (plus de code), `diskStorage` (fichier non vérifié écrit
  avant validation).

## 2. Vérification et nettoyage

- **Decision**:
  1. **signature binaire** vérifiée avant tout décodage : JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`,
     WebP `RIFF????WEBP` ; tout le reste (dont SVG, GIF, PDF, texte renommé) → 400 ;
  2. `sharp(buffer, { limitInputPixels: 40_000_000 })` (protection contre les « bombes » de
     décompression) → `.rotate()` (applique l'orientation EXIF) → `.resize({ width, withoutEnlargement: true })`
     → `.webp({ quality: 80 })` ; sharp **n'écrit aucune métadonnée** par défaut (GPS, appareil, date
     supprimés) ;
  3. deux sorties : `…-1600.webp` (détail) et `…-480.webp` (carte).
- **Rationale**: le type MIME et l'extension sont fournis par le client et falsifiables (FR-002) ; le
  ré-encodage neutralise aussi un éventuel contenu caché ; WebP réduit fortement le poids (SC-005).
- **Alternatives considered**: `file-type` (dépendance de plus pour 3 signatures), garder le format
  d'origine (métadonnées à retirer format par format).

## 3. Envoi « tout ou rien »

- **Decision**: toutes les photos d'une requête sont vérifiées et traitées **avant** d'écrire le moindre
  fichier ; si l'une échoue, rien n'est écrit et l'annonce est inchangée (FR-012) ; si l'écriture en base
  échoue après l'écriture des fichiers, les fichiers sont supprimés.
- **Rationale**: pas de photo orpheline ni d'annonce à moitié modifiée.

## 4. Stockage et URL

- **Decision**: fichiers dans `UPLOADS_DIR` (défaut `backend/uploads/`, dans `.gitignore`), nommés
  `crypto.randomUUID()` ; servis en statique sur `/uploads/<uuid>-480.webp` avec
  `X-Content-Type-Options: nosniff` et un cache long. Le proxy Vite relaie `/uploads` comme `/api`.
- **Rationale**: noms non devinables (FR-008) ; aucun listing de dossier (`express.static` sans index) ;
  pas de compte externe (décision équipe).
- **Alternatives considered**: Cloudinary (écarté par l'équipe), stockage en base (GridFS : plus lourd).
- **Limite connue**: une photo reste accessible à qui connaît son URL tant que l'annonce existe, même
  vendue ; acceptable pour des photos destinées à être publiques.

## 5. Modèle

- **Decision**: tableau imbriqué `photos` dans `Listing` (`id`, `url`, `cardUrl`, `width`, `height`),
  5 maximum ; l'ordre du tableau est l'ordre d'affichage, la position 0 est la photo principale.
- **Rationale**: les photos n'existent pas sans l'annonce, sont toujours lues avec elle, et sont peu
  nombreuses ; réordonner = réécrire un tableau de 5 éléments.

## 6. Routes

- **Decision**:
  - `POST /api/listings/:id/photos` (multipart, 1 à 5 fichiers) → 201 + annonce ;
  - `PATCH /api/listings/:id/photos` `{ "order": [photoId…] }` (permutation exacte des ids existants) →
    200 + annonce ; la première devient principale ;
  - `DELETE /api/listings/:id/photos/:photoId` → 200 + annonce.
  Toutes filtrent `{ _id: id, ownerId: req.userId }` → 404 sinon.
- **Rationale**: renvoyer l'annonce évite un aller-retour au front ; la création reste en JSON (les 5
  routes du contrat ne changent pas).

## 7. Publication avec photos

- **Decision**: le formulaire crée d'abord l'annonce (`POST /api/listings`, JSON) puis envoie les photos.
  Si l'envoi des photos échoue, l'annonce est créée sans photo, l'utilisateur arrive sur la page de
  modification avec le message d'erreur et peut réessayer.
- **Rationale**: garde le contrat v1 intact ; cas d'échec rare et récupérable.
- **Alternatives considered**: une seule requête multipart pour créer l'annonce et ses photos (change le
  contrat de `POST /api/listings`).

## 8. Suppression

- **Decision**: `listing.service.remove()` supprime l'annonce puis ses fichiers (`fs.rm`, erreurs
  journalisées sans bloquer) ; `DELETE …/photos/:photoId` retire l'entrée puis les 2 fichiers.
- **Rationale**: FR-007 et SC-006.

## 9. Front

- **Decision**: `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>` caché derrière un
  bouton « Ajouter des photos » ; aperçus `URL.createObjectURL` ; contrôle de taille et de type côté
  navigateur (confort seulement) ; réordonner par boutons « ← » / « → » et « Photo principale »
  (utilisables au clavier, pas de glisser-déposer obligatoire) ; galerie : grande image + vignettes en
  boutons, flèches gauche/droite, `alt` « titre, photo N sur M ».
- **Rationale**: FR-009 à FR-011 ; accessibilité sans librairie.

## 10. Docker et tests

- **Decision**: en dev, `backend/uploads/` est dans le volume du code monté (persistant sur la machine) ;
  `UPLOADS_DIR` est lu depuis l'environnement. Les tests utilisent `fs.mkdtemp` et nettoient à la fin.
  Les images de test sont générées par `sharp` (dont une avec `withExif` contenant une position GPS).
- **Rationale**: aucun fichier binaire de test à versionner ; tests déterministes.
