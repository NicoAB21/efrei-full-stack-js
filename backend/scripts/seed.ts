// Données de démonstration : 5 comptes et leurs annonces (avec photos), pour tester sans tout saisir à la main.
// Usage : npm run seed   (Docker : docker compose exec backend npm run seed)
// Relançable : supprime d'abord les comptes en @occaz.test (et leurs annonces, photos, favoris, achats), rien d'autre.
// Photos : seed/photos/ (Wikimedia Commons, licences libres, crédits dans seed/photos/CREDITS.md).
import { readFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import { Favorite } from '../src/models/favorite.js'
import { Listing } from '../src/models/listing.js'
import { Purchase } from '../src/models/purchase.js'
import { User } from '../src/models/user.js'
import type { ListingCreateInput } from '../src/schemas/listing.js'
import { register } from '../src/services/auth.service.js'
import * as favoriteService from '../src/services/favorite.service.js'
import * as listingService from '../src/services/listing.service.js'
import * as photoService from '../src/services/photo.service.js'

const PASSWORD = 'motdepasse'
const SEED_EMAILS = /@occaz\.test$/
const PHOTOS_DIR = new URL('../seed/photos/', import.meta.url)

// Communes officielles (code INSEE + un code postal valide)
const PARIS_11 = { cityCode: '75056', postalCode: '75011' }
const PARIS_18 = { cityCode: '75056', postalCode: '75018' }
const LYON_3 = { cityCode: '69123', postalCode: '69003' }
const LYON_7 = { cityCode: '69123', postalCode: '69007' }
const MARSEILLE = { cityCode: '13055', postalCode: '13006' }
const TOULOUSE = { cityCode: '31555', postalCode: '31000' }
const BORDEAUX = { cityCode: '33063', postalCode: '33000' }
const LILLE = { cityCode: '59350', postalCode: '59000' }
const NANTES = { cityCode: '44109', postalCode: '44000' }

type Seed = Omit<ListingCreateInput, 'cityCode' | 'postalCode'> & {
  at: { cityCode: string; postalCode: string }
  daysAgo: number
  /** Fichiers de seed/photos/, dans l'ordre (le premier = photo principale) */
  photos?: string[]
  sold?: boolean
}
const euros = (n: number) => Math.round(n * 100)
const shots = (name: string, count: number) => Array.from({ length: count }, (_, i) => `${name}-${i + 1}.jpg`)

const ACCOUNTS: Record<string, Seed[]> = {
  'alice@occaz.test': [
    { title: 'Vélo de ville bleu, cadre acier', priceCents: euros(85), category: 'loisirs', at: LYON_3, daysAgo: 0, photos: shots('velo', 1),
      description: `Je vends mon vélo de ville, je déménage et je ne pourrai pas le garder.
Il roule très bien, je l'utilisais pour aller au boulot tous les jours. Pneus changés au printemps, freins réglés.
Quelques traces d'usure sur le cadre (normal vu l'âge) mais rien de grave.

Taille adaptée pour 1m60 à 1m80 environ.
Panier avant offert si vous le voulez.

À récupérer sur Lyon 3e, pas d'envoi. Dispo le soir après 18h et le week-end.` },
    { title: 'Lampe de bureau vintage années 50', priceCents: euros(35), category: 'maison', at: LYON_3, daysAgo: 2, photos: shots('lampe', 1),
      description: `Lampe de bureau ancienne en bakélite, trouvée chez ma grand-mère.
Bras flexible, fonctionne parfaitement (ampoule E27, câble refait).
Très déco sur un bureau ou une table de chevet.

Pas de négociation sur le prix svp, je la trouve déjà pas chère 🙂` },
    { title: 'Casque vélo enfant, taille S (52-56 cm)', priceCents: euros(10), category: 'loisirs', at: LYON_7, daysAgo: 5, photos: shots('casque', 3),
      description: `Casque de mon fils, devenu trop petit. Jamais tombé avec.
Réglage par molette à l'arrière, sangles en bon état.
Lavé avant la mise en vente.` },
    { title: 'Robe d’été fleurie, taille 38', priceCents: euros(12), category: 'mode', at: LYON_3, daysAgo: 9,
      description: `Robe légère portée deux fois, comme neuve. Taille 38, coupe ample.
Je n'ai pas encore fait de photo, je peux en envoyer par message si besoin.
Possibilité d'envoi en lettre suivie (frais à votre charge).` },
    { title: 'Machine à café expresso Krups', priceCents: euros(40), category: 'maison', at: LYON_3, daysAgo: 21, photos: shots('cafe', 1), sold: true,
      description: `Machine expresso Krups avec buse vapeur. Détartrée régulièrement, fonctionne nickel.
Je l'ai remplacée par une machine à grain.
Vendue avec le porte-filtre et deux filtres (1 et 2 tasses).` },
  ],
  'bruno@occaz.test': [
    { title: 'iPhone 13 128 Go bleu, très bon état', priceCents: euros(390), category: 'multimedia', at: PARIS_11, daysAgo: 0, photos: shots('iphone', 1),
      description: `iPhone 13 bleu 128 Go, débloqué tout opérateur.
Toujours protégé par une coque et un verre trempé depuis l'achat : aucune rayure sur l'écran, petite marque sur un coin de la coque arrière (visible en photo).
Batterie à 87 %.

Vendu avec boîte d'origine et câble. Facture Fnac disponible.
Remise en main propre à Paris 11e, je peux faire un test devant vous.
Pas d'échange, merci.` },
    { title: 'Bureau en bois + écran 24 pouces', priceCents: euros(140), category: 'multimedia', at: PARIS_18, daysAgo: 2, photos: shots('ecran', 1),
      description: `Je vends l'ensemble bureau + écran car je passe en télétravail chez ma copine.
Bureau 120 x 60 cm avec caisson 3 tiroirs, quelques rayures sur le plateau.
Écran 24 pouces Full HD, câble HDMI fourni.

Le bureau se démonte facilement (je peux aider à démonter). Prévoir une voiture.
Possibilité de vendre l'écran seul à 80 €.` },
    { title: 'Appartement T2 45 m² refait à neuf, Paris 11e', priceCents: euros(395_000), category: 'immobilier', at: PARIS_11, daysAgo: 4, photos: shots('appart', 3),
      description: `Particulier vend T2 de 45 m² au 3e étage avec ascenseur, entièrement refait en 2025.

- Séjour lumineux avec parquet chêne et cuisine ouverte équipée (four, plaques, hotte, lave-vaisselle)
- Une chambre avec placard
- Salle d'eau avec WC
- Double vitrage, chauffage individuel électrique
- Cave

Copropriété de 18 lots, charges 120 €/mois. Taxe foncière 780 €.
Métro Parmentier à 3 minutes.

Pas d'agences svp. Visites le samedi sur rendez-vous.` },
    { title: 'Nintendo Switch + 2 manettes Joy-Con', priceCents: euros(180), category: 'multimedia', at: PARIS_11, daysAgo: 6, photos: shots('console', 1),
      description: `Switch première version (boîte rouge), achetée en 2020. Fonctionne parfaitement, pas de drift sur les Joy-Con.
Vendue avec le dock, le support de manettes, le chargeur et le câble HDMI.
Je peux ajouter Mario Kart 8 pour 25 € de plus.` },
    { title: 'Trottinette électrique Xiaomi M365', priceCents: euros(170), category: 'loisirs', at: PARIS_18, daysAgo: 11, photos: shots('trottinette', 1),
      description: `Xiaomi M365, environ 1800 km au compteur. Autonomie réelle autour de 20 km.
Pneus pleins installés l'an dernier : fini les crevaisons !
Freins réglés, éclairage avant et arrière OK. Chargeur fourni.
Pliable, pratique pour le métro.` },
  ],
  'chloe@occaz.test': [
    { title: 'Peugeot 208 GT Line 1.2 PureTech, 2020', priceCents: euros(14_900), category: 'vehicules', at: MARSEILLE, daysAgo: 1, photos: shots('peugeot', 2),
      description: `Vends ma Peugeot 208 GT Line rouge, première main, achetée neuve en concession.
62 000 km, essence 1.2 PureTech 100 ch, boîte manuelle.
Entretien fait chez Peugeot (carnet et factures), courroie faite à 60 000 km.
Contrôle technique OK sans aucune remarque.

Options : écran tactile, CarPlay, caméra de recul, toit vitré, jantes 17".
Pneus avant neufs.

Non fumeur, pas d'animaux. Prix un peu négociable après essai.
Pas de reprise, pas d'échange.` },
    { title: 'Canapé de style Louis XV, velours rouge', priceCents: euros(450), category: 'maison', at: MARSEILLE, daysAgo: 4, photos: shots('canape', 1),
      description: `Magnifique canapé de style Louis XV, bois doré et tissu velours rouge à motifs.
Hérité de ma tante, très bien conservé, aucune tache ni déchirure.
Longueur 2 m environ.

Il est trop grand pour mon appartement, c'est un crève-cœur de m'en séparer.
À venir chercher sur Marseille 6e (2e étage sans ascenseur, prévoir 2 personnes).` },
    { title: 'Lot de 2 raquettes Wilson (Clash 100 et Blade 98)', priceCents: euros(90), category: 'loisirs', at: MARSEILLE, daysAgo: 8, photos: shots('raquettes', 1),
      description: `Deux raquettes Wilson, cordées il y a 3 mois.
- Clash 100 : grip 2, utilisée une saison
- Blade 98 : grip 3, très peu jouée

Housse Wilson fournie. Vente possible séparément (50 € pièce).` },
    { title: 'Veste en jean délavée, taille M', priceCents: euros(15), category: 'mode', at: MARSEILLE, daysAgo: 13, photos: shots('veste', 1),
      description: `Veste en jean coupe classique, taille M (taille un peu petit, plutôt un S/M).
Portée quelques fois, aucun défaut.
Je fais des lots si vous prenez plusieurs articles sur mon profil !` },
  ],
  'david@occaz.test': [
    { title: 'Scooter Yamaha Vity 125 + top case', priceCents: euros(1_350), category: 'vehicules', at: TOULOUSE, daysAgo: 2, photos: shots('scooter', 1),
      description: `Yamaha Vity 125 cm³, 14 500 km. Démarre au quart de tour.
Vidange et bougie faites le mois dernier. Pneus à 50 %.
Top case Givi offert avec la clé.

Carte grise à mon nom, certificat de non-gage fourni.
Permis A1 ou B + formation 7h nécessaire.` },
    { title: 'Bibliothèque ancienne style néo-gothique', priceCents: euros(380), category: 'maison', at: BORDEAUX, daysAgo: 4, photos: shots('bibliotheque', 1),
      description: `Grande bibliothèque ancienne en bois massif sculpté, partie haute vitrée et partie basse fermée.
Dimensions : H 210 cm x L 120 cm x P 45 cm.
Très lourde, se démonte en deux parties.

Quelques petites marques d'usage cohérentes avec l'âge. Les clés des portes sont présentes.
À venir chercher sur Bordeaux, prévoir un utilitaire.` },
    { title: 'Sony A7R IV + objectif Zeiss 55 mm f/1.8', priceCents: euros(2_100), category: 'multimedia', at: TOULOUSE, daysAgo: 6, photos: shots('appareil', 3),
      description: `Je me sépare de mon Sony A7R IV, je passe sur un autre système.
Environ 15 000 déclenchements. Capteur nettoyé, aucune poussière.
Écran et viseur parfaits, aucune rayure.

Vendu avec :
- objectif Sony Zeiss 55 mm f/1.8 avec pare-soleil
- 2 batteries d'origine + chargeur
- boîte et notice

Remise en main propre uniquement (Toulouse centre), vous pourrez le tester.` },
    { title: 'Lot de 20 livres de poche (romans, policiers)', priceCents: euros(20), category: 'autre', at: BORDEAUX, daysAgo: 10, photos: shots('livres', 1),
      description: `Je fais du tri ! Lot de 20 livres de poche : Musso, Grangé, Fred Vargas, Agatha Christie…
Lus une fois, bon état général.
Pas de vente à l'unité, désolé.` },
    { title: 'Montre automatique, édition limitée numérotée', priceCents: euros(12_500), category: 'mode', at: TOULOUSE, daysAgo: 15, photos: shots('montre', 1),
      description: `Montre automatique de collection, édition limitée numérotée, fond saphir transparent.
Boîtier acier et plaqué or, bracelet cuir d'origine.
Révisée chez un horloger l'an dernier (facture).

Boîte, papiers et certificat d'authenticité.
Rendez-vous dans une banque ou chez un horloger pour la transaction. Pas de curieux svp.` },
  ],
  'emma@occaz.test': [
    { title: 'Poussette 3 en 1 avec nacelle et siège auto', priceCents: euros(160), category: 'autre', at: NANTES, daysAgo: 1,
      description: `Poussette trio : châssis, nacelle et siège auto.
Utilisée pour un seul enfant, toujours rangée à l'intérieur. Housses lavées.
Je n'ai plus le manuel mais il se trouve en PDF sur internet.

Photos sur demande. Remise en main propre à Nantes.` },
    { title: 'Guitare électro-acoustique + housse', priceCents: euros(130), category: 'loisirs', at: LILLE, daysAgo: 3, photos: shots('guitare', 1),
      description: `Guitare électro-acoustique avec préampli et accordeur intégré.
Très bon son, cordes changées récemment.
Vendue avec une housse rembourrée et le stand.

J'ai appris dessus mais je joue plus assez, elle mérite mieux que de rester dans un coin 🎸` },
    { title: 'Table basse vintage en teck', priceCents: euros(75), category: 'maison', at: NANTES, daysAgo: 5, photos: shots('table', 2),
      description: `Jolie table basse scandinave vintage en teck, avec étagère.
Dimensions : 110 x 45 cm, hauteur 45 cm.
Petites traces d'usage sur le plateau, rien de choquant (voir photos).

Se démonte pas, prévoir une voiture assez grande.` },
    { title: 'Baskets running Asics, pointure 39', priceCents: euros(35), category: 'mode', at: LILLE, daysAgo: 12, photos: shots('baskets', 1),
      description: `Asics violettes, portées une dizaine de fois pour courir.
Trop petites pour moi, je fais plutôt du 39,5.
Semelles en très bon état. Envoi possible via Mondial Relay.` },
  ],
}

// Favoris de démonstration : emma suit quelques annonces des autres
const FAVORITES_OF = {
  'emma@occaz.test': ['Vélo de ville bleu, cadre acier', 'iPhone 13 128 Go bleu, très bon état', 'Canapé de style Louis XV, velours rouge'],
}

try {
  process.loadEnvFile()
} catch {
  // pas de .env
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI manquant')
await mongoose.connect(process.env.MONGODB_URI)

// 1. Nettoyage d'un précédent seed (uniquement les comptes @occaz.test ; remove() efface aussi les fichiers photo)
const previous = await User.find({ email: SEED_EMAILS })
for (const user of previous) {
  const ownerId = String(user._id)
  for (const listing of await Listing.find({ ownerId })) await listingService.remove(ownerId, String(listing._id))
  await Favorite.deleteMany({ userId: user._id })
  await Purchase.deleteMany({ buyerId: user._id })
}
await User.deleteMany({ email: SEED_EMAILS })

// 2. Comptes, annonces et photos, par les mêmes services que l'API (communes vérifiées, photos ré-encodées)
const ids = new Map<string, string>()
const titles = new Map<string, string>()
let photoCount = 0
for (const [email, seeds] of Object.entries(ACCOUNTS)) {
  const { user } = await register({ email, password: PASSWORD })
  ids.set(email, user.id)
  for (const { at, daysAgo, sold, photos = [], ...data } of seeds) {
    const listing = await listingService.create(user.id, { ...data, ...at })
    const listingId = String(listing._id)
    titles.set(data.title, listingId)
    if (photos.length > 0) {
      const files = await Promise.all(photos.map(async (name) => ({ buffer: await readFile(new URL(name, PHOTOS_DIR)), originalname: name })))
      await photoService.add(user.id, listingId, files)
      photoCount += files.length
    }
    // Dates étalées pour une vitrine réaliste (tri, « Publiée le »)
    const date = new Date(Date.now() - daysAgo * 86_400_000 - Math.random() * 36e5)
    await Listing.collection.updateOne({ _id: listing._id }, { $set: { createdAt: date, updatedAt: date, ...(sold && { status: 'sold' }) } })
  }
}

for (const [email, favorites] of Object.entries(FAVORITES_OF)) {
  for (const title of favorites) await favoriteService.add(ids.get(email) as string, titles.get(title) as string)
}

const total = Object.values(ACCOUNTS).reduce((n, seeds) => n + seeds.length, 0)
console.log(`${ids.size} comptes, ${total} annonces et ${photoCount} photos créés (mot de passe commun : ${PASSWORD})`)
for (const [email, seeds] of Object.entries(ACCOUNTS)) console.log(`  ${email.padEnd(18)} ${seeds.length} annonces`)
await mongoose.disconnect()
