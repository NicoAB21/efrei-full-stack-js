# Guide de marque Occaz — « Étiquette »

Occaz est un site de petites annonces entre particuliers. La DA part de l'objet le plus simple d'un vide-grenier : **l'étiquette de prix**. Elle est claire et épurée, pour inspirer confiance, avec un seul geste fort : l'étiquette orange percée.

Charte d'origine : [`MAP_Projet.md`](../../../MAP_Projet.md) (Ismael). Disposition reprise de la maquette « Bonne affaire », identité de la maquette « Étiquette ». Référence vivante : la page `/design`.

## Couleurs

| Token | Valeur | Rôle |
|---|---|---|
| `--tag` | `#C2410C` | **Action principale** et prix. Toujours avec du texte blanc (5,2:1). |
| `--tag-dk` | `#9A3412` | Survol, texte orange sur fond clair |
| `--tag-lt` | `#FDBA74` | Orange sur fond bleu nuit |
| `--tag-soft` | `#FFF7ED` | Fond des zones mises en avant (état vide) |
| `--night` | `#1E293B` | Texte, et **point de l'étiquette du logo** |
| `--paper` | `#F8FAFC` | Fond de page |
| `--soft` | `#F1F5F9` | Tuiles, images vides, boutons secondaires |
| `--ok` | `#15803D` | Disponible |
| `--sold` | `#475569` | Vendue |
| `--danger` | `#B91C1C` | Erreur, suppression |

- L'orange est réservé à l'**action principale** d'un écran (un seul bouton orange par zone), aux **prix** et au logo. Le reste est bleu nuit, blanc cassé et gris.
- Jamais de texte bleu nuit sur l'orange : 2,8:1 seulement. Sur l'orange, le texte est blanc.
- Un statut est **toujours écrit** (« Disponible », « Vendue »), la couleur ne fait que l'appuyer.
- Contrastes vérifiés : texte ≥ 4,5:1, contours de champs ≥ 3:1. Thème clair uniquement.

## Typo

- **Inter** variable, hébergée dans `fonts/` (OFL), sans Google Fonts.
- Titres en 900/800, interlettrage serré (−0,035em). Corps en 15 px, 400.
- Les prix en chiffres tabulaires (`font-variant-numeric: tabular-nums`) : ils s'alignent dans une liste.
- Champs de formulaire en 16 px minimum (pas de zoom automatique sur iOS).

## La signature : l'étiquette

- **Prix** : toujours dans une `.price-tag` (composant `PriceTag`). Sur une carte, accrochée en haut à gauche de l'image. Sur le détail, en grand (`size="lg"`).
- Le trou de l'étiquette de prix laisse voir le fond (`--hole-bg`), comme une vraie étiquette percée.
- **Annonce vendue** : étiquette grise + tampon « Vendu » incliné sur l'image. Jamais l'un sans l'autre sur une carte.
- **Hero** : une grande étiquette en filigrane blanc à 10 %. Une seule par page.
- Pas d'autre forme d'étiquette ailleurs (pas sur les boutons, les badges ou les titres) : elle doit rester rare pour rester forte.

## Formes et mouvement

- Rayons : 12 px pour les champs, 20 px pour les cartes et tuiles, 28 px pour les panneaux et le hero. Boutons et badges en pilule.
- Cibles tactiles de 44 px minimum : boutons 48 px, `btn-sm` et boutons-icônes 44 px.
- Mouvements courts (0,12 à 0,2 s), sans rebond : la carte se soulève de 2 % au survol, le bouton s'enfonce au clic. Tout est coupé si `prefers-reduced-motion` est actif.

## Logo

Fichiers dans [`brand/`](brand/), régénérables avec `gen-logo.py`.

- **Logo** : « occaz » en Inter 800 blanc dans une étiquette orange. Le **point est toujours bleu nuit** (`--tag-hole`), quel que soit le fond.
- Dans l'interface, le logo est en CSS (`.logo`, composant `Logo`) ; `logo.svg` sert aux exports (README, slides, réseaux).
- **Favicon** : « oz », le « o » bleu nuit et le « z » orange, sur fond blanc cassé. Dessiné en formes géométriques : il rend pareil partout, sans police.
- **Interdits** : déformer, recolorer hors palette, ajouter une ombre, mettre du texte bleu nuit dans l'étiquette.

## Icônes

- [Lucide](https://lucide.dev) uniquement, via `lucide-react` (ISC, sans attribution). Trait de 2 px ; 1,5 à 1,75 px pour les grands pictos (images vides, catégories).
- Une icône seule est toujours nommée (`aria-label`) ou doublée d'un texte, même masqué (`.nav-label` sur mobile).
- **Pas d'émojis dans l'interface.**

## Ton

- Français, vouvoiement, phrases courtes et concrètes. Des faits plutôt que des adjectifs : « Publiée le 26 oct. », pas « Super annonce ! ».
- Les boutons sont des verbes : « Publier l'annonce », « Contacter le vendeur », « Marquer comme vendue ».
- Les erreurs disent quoi faire : « Le prix doit être supérieur à 0 € », pas « Prix invalide ».
- Un état vide propose toujours la suite (`EmptyState` avec une action).
