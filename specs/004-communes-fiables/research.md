# Research: Communes fiables

## 1. Source du référentiel

- **Decision**: API Géo de l'État,
  `https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,codeDepartement&format=json`,
  téléchargée par `npm run data:communes` et versionnée dans `backend/data/communes.json`.
- **Constat (2026-10-28)** : 34 969 communes, 35 493 couples commune/code postal, 3,0 Mo brut, **1,4 Mo**
  en format compact `[code, nom, département, [codes postaux]]` ; 133 communes d'outre-mer ;
  Paris (75056), Lyon (69123) et Marseille (13055) sont une seule commune avec 21, 9 et 16 codes postaux ;
  4 communes « Saint-Denis » (11, 30, 93, 974) ; 5 communes sans code postal (exclues des suggestions).
- **Rationale**: source officielle, gratuite, sans clé ; fichier local = pas de réseau en démo ni en test
  (décision équipe).
- **Alternatives considered**: appel direct à l'API Géo (réseau, latence, tests à simuler) ; base officielle
  INSEE (pas les codes postaux) ; base La Poste (format CSV moins pratique).

## 2. Normalisation

- **Decision**: `normalize(s)` = minuscules → décomposition NFD → suppression des accents → tirets,
  apostrophes et espaces multiples remplacés par un espace → `trim`. « Saint-Étienne », « saint etienne »
  et « SAINT ETIENNE » donnent tous `saint etienne`. Clé stockée dans l'annonce : `cityKey`.
- **Rationale**: FR-005 et SC-004 ; une seule fonction partagée par la recherche, la validation, le filtre
  et la migration.

## 3. Suggestions

- **Decision**: `GET /api/communes?q=` public, `q` de 2 à 60 caractères ; si `q` est 5 chiffres (ou un début
  de code postal de 2 à 5 chiffres), recherche par code postal, sinon par préfixe du nom normalisé ;
  un résultat par couple (commune, code postal), 20 maximum ; tri : nom exactement égal à la saisie
  d'abord, puis **population décroissante** (« mar » → Marseille, « lyo » → Lyon), puis ordre alphabétique,
  puis code postal. La population est ajoutée au référentiel (champ `population` de l'API Géo) : le tri
  alphabétique seul proposait « Lyoffans » avant Lyon (constaté à l'implémentation). Réponse :
  `{ items: [{ cityCode, name, postalCode, department, label: "Lyon (69003)" }] }`.
- **Rationale**: US1 (« lyo », « 69003 ») et homonymes distingués par le code postal et le département.
- **Alternatives considered**: recherche floue (fautes de frappe) : utile mais non demandé (VI).

## 4. Contrat de l'annonce

- **Decision**: en **entrée**, `POST`/`PATCH /api/listings` reçoivent `cityCode` (5 caractères, code
  officiel, ex. `69123` ou `2A004`) et `postalCode` (5 chiffres) ; `city` n'est plus accepté (schéma strict →
  400). `cityCode` et `postalCode` vont ensemble en `PATCH`. Le serveur vérifie que `postalCode` appartient
  à la commune, puis enregistre `city` = nom officiel et `cityKey`. En **sortie**, `city` reste présent
  (texte), plus `cityCode` et `postalCode`.
- **Rationale**: le nom seul est ambigu ; l'affichage existant (`listing.city`) continue de marcher.
- **Alternatives considered**: garder `city` en entrée et deviner la commune (homonymes impossibles).

## 5. Filtre de la vitrine

- **Decision**: `city` (texte) est conservé en paramètre ; le serveur le normalise et cherche
  `cityKey` égal (toutes les annonces de la commune, tous codes postaux) ; nouveau paramètre facultatif
  `cityCode` (exact) utilisé par les suggestions et les puces. Pour les annonces anciennes non
  rattachées, repli sur l'ancienne comparaison du texte.
- **Rationale**: FR-005 sans casser les liens partagés existants (`/?city=Lyon`).

## 6. Annonces existantes

- **Decision**: `npm run migrate:communes` (une fois au déploiement, relançable sans effet de bord) : pour
  chaque annonce sans `cityCode`, si le nom normalisé correspond à **une seule** commune, on pose
  `cityCode`, `city` (nom officiel), `cityKey`, et `postalCode` si la commune n'a qu'un code postal ; sinon
  l'annonce reste en texte libre. Le script affiche le nombre d'annonces rattachées / laissées.
  En modification, une annonce sans `cityCode` doit en recevoir un (FR-008).
- **Rationale**: US4 et SC-005 (aucune annonce ne disparaît).

## 7. Combobox d'accessibilité

- **Decision**: motif WAI-ARIA « combobox avec liste » : `input role="combobox"` + `aria-expanded`,
  `aria-controls`, `aria-activedescendant` ; liste `role="listbox"` d'options `role="option"` ;
  flèches haut/bas, Entrée pour choisir, Échap pour fermer ; requête après 250 ms sans frappe ; région
  `aria-live` qui annonce « 5 suggestions ». Choisir une suggestion remplit `cityCode` + `postalCode`
  (champs cachés) ; taper à nouveau les efface.
- **Rationale**: FR-009 sans librairie ; réutilisé dans le formulaire et la recherche de l'accueil.

## 8. Mise à jour du référentiel

- **Decision**: relancer `npm run data:communes` une fois par an ; une commune disparue ne supprime pas les
  annonces (leur `city` reste affiché, voir cas limite « commune fusionnée »).
