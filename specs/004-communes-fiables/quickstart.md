# Quickstart: valider les communes

Contrat : [contracts/communes.openapi.yaml](./contracts/communes.openapi.yaml) · règles :
[data-model.md](./data-model.md).

## Données

```bash
cd backend
npm run data:communes        # (re)télécharge le référentiel → data/communes.json (~1,4 Mo)
npm run migrate:communes     # rattache les annonces existantes ; affiche « N rattachées, M laissées »
```

## Automatique

```bash
cd backend && npm run lint && npm run build && npm test
cd frontend && npm run lint && npm run build && npm test
```

Les tests doivent couvrir : suggestions « lyo » (Lyon, 9 codes postaux), « 69003 », « saint etienne »
(accents/tirets), « saint-denis » (4 communes distinguées par département), `q` d'1 caractère → 400 ;
création avec commune inventée → 400, code postal d'une autre commune → 400, `city` envoyé → 400, couple
valide → 201 avec `city` = nom officiel ; filtre `city=lyon` → toutes les annonces de Lyon ; migration :
« lyon » rattachée, « Saint-Denis » et « Lyonnn » laissées.

## API (curl)

| Requête | Attendu |
|---|---|
| `GET /api/communes?q=lyo` | 200, Lyon (69001) … (69009) parmi les premiers |
| `GET /api/communes?q=97400` | 200, Saint-Denis (97400), La Réunion |
| `POST /api/listings` `{…, "cityCode":"69123","postalCode":"69003"}` | 201, `"city":"Lyon"` |
| `POST /api/listings` `{…, "cityCode":"69123","postalCode":"75001"}` | 400 |
| `POST /api/listings` `{…, "city":"Lyon"}` | 400 |
| `GET /api/public/listings?city=LYON` | toutes les annonces de Lyon, tous codes postaux |

## Navigateur

1. Formulaire : taper « lyo », naviguer aux flèches, Entrée sur « Lyon (69003) », publier.
2. Taper un texte sans choisir : « Choisissez une commune dans la liste ».
3. Accueil : le champ Ville propose les mêmes suggestions ; une seule puce « Lyon » avec le bon total.
4. Lecteur d'écran : le nombre de suggestions est annoncé.
