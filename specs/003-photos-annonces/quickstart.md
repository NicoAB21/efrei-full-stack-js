# Quickstart: valider les photos

Contrat : [contracts/photos.openapi.yaml](./contracts/photos.openapi.yaml) · règles :
[data-model.md](./data-model.md).

## Prérequis

- `npm install` dans `backend/` (ajoute `multer` et `sharp`) ; en Docker : `docker compose up --build -V`.
- `UPLOADS_DIR` facultatif (défaut `backend/uploads/`, ignoré par git).

## Automatique

```bash
cd backend && npm run lint && npm run build && npm test     # dont tests/photos.test.ts
cd frontend && npm run lint && npm run build && npm test
```

`photos.test.ts` doit couvrir : 2 JPEG → 201 et 2 entrées ; 6e photo → 400 ; SVG, GIF, PDF, texte renommé
`.jpg` → 400 ; 6 Mo → 400 ; envoi mixte (1 valide + 1 SVG) → 400 et annonce inchangée ; photo avec GPS →
fichier servi **sans** EXIF ; orientation appliquée ; réordonner (permutation invalide → 400) ; supprimer
la principale → la suivante devient principale ; supprimer l'annonce → fichiers absents du disque ;
sans token → 401 ; **isolation A/B** sur POST/PATCH/DELETE → 404 et annonce de A intacte.

Contre-épreuve : retirer `ownerId` du filtre de `photo.service.ts` DOIT faire échouer le test d'isolation.

## API (curl)

```bash
curl -s -X POST $API/listings/$ID/photos -H "Authorization: Bearer $TOKEN_A" \
  -F photos=@velo1.jpg -F photos=@velo2.png                      # 201, photos[0] = principale
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/listings/$ID/photos \
  -H "Authorization: Bearer $TOKEN_A" -F photos=@logo.svg       # 400
curl -s http://localhost:3000$(…photos[0].cardUrl) -o carte.webp  # WebP 480 px
exiftool carte.webp                                              # aucune donnée GPS
```

## Navigateur

1. Publier une annonce avec 3 photos (aperçus visibles avant envoi) ; la carte de la vitrine montre la 1re.
2. Sur le détail public : galerie, passage d'une photo à l'autre à la souris et aux flèches du clavier.
3. Modifier : définir la 3e comme principale, supprimer la 1re ; la carte change.
4. Tenter un SVG ou une photo de 6 Mo : message lisible, rien n'est envoyé.
5. Supprimer l'annonce : l'URL d'une de ses photos répond 404.
6. Lecteur d'écran : « Vélo de ville, photo 2 sur 3 ».
