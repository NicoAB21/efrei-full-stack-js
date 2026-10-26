# Design system Occaz — « Étiquette »

Le style du front Occaz : blanc cassé, bleu nuit et orange, avec une seule signature, l'étiquette de prix percée. Validé le 2026-10-26 après comparaison de 4 maquettes (« Étiquette », « Vide-grenier », « Bonne affaire » et le mix retenu).

## Source de vérité

- **Dossier** : [`frontend/src/design-system/`](../frontend/src/design-system/), avec `tokens.css`, `components.css`, la police et les fichiers de marque.
- **Règles de marque** : [`GUIDE.md`](../frontend/src/design-system/GUIDE.md). C'est là qu'on décide quand mettre de l'orange, l'étiquette ou le tampon.
- **Composants React** : [`frontend/src/components/`](../frontend/src/components/).
- **Référence vivante** : la page `/design` du front (http://localhost:5173/design).
- **Charte d'origine** : [`MAP_Projet.md`](../MAP_Projet.md) (Ismael).
- Ne pas recopier les valeurs ici : elles vivent dans `tokens.css`.

## En bref

- **Thème** : clair uniquement.
- **Orange** `#C2410C` = action principale, prix, logo. Le reste en bleu nuit `#1E293B`, blanc cassé et gris.
- **Étiquette** : les prix sont dans une étiquette orange percée ; une annonce vendue a une étiquette grise et un tampon « Vendu ».
- **Logo** : « occaz » dans une étiquette, point bleu nuit fixe. **Favicon** : « oz ».
- **Typo** : Inter variable, hébergée en local.
- **Icônes** : Lucide (`lucide-react`). **Pas d'émojis**, CSS natif, aucune lib UI.

## Disposition (reprise de « Bonne affaire »)

- En-tête blanc collant : logo, navigation (icônes seules sur mobile), bouton « Vendre ».
- Accueil (US4) : hero en aplat orange, tuiles de catégories, grille de cartes carrées.
- Détail : panneau avec badge de statut, grand prix en étiquette, infos en petites cases.
- Pied de page bleu nuit avec le logo et le slogan.

## Écarté pour le MVP

Favoris, badges « Nouveau » et « Prix en baisse » (pas de données pour les alimenter), barre de recherche dans l'en-tête (la recherche arrive avec la vitrine US4), mode sombre (l'orange tombe à 3,45:1 sur fond sombre).
