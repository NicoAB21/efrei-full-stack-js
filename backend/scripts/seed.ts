// Données de démonstration : 5 comptes et leurs annonces, pour tester sans tout saisir à la main.
// Usage : npm run seed   (Docker : docker compose exec backend npm run seed)
// Relançable : supprime d'abord les comptes en @occaz.test (et leurs annonces, favoris, achats), rien d'autre.
import mongoose from 'mongoose'
import { Favorite } from '../src/models/favorite.js'
import { Listing } from '../src/models/listing.js'
import { Purchase } from '../src/models/purchase.js'
import { User } from '../src/models/user.js'
import type { ListingCreateInput } from '../src/schemas/listing.js'
import { register } from '../src/services/auth.service.js'
import * as favoriteService from '../src/services/favorite.service.js'
import * as listingService from '../src/services/listing.service.js'

const PASSWORD = 'motdepasse'
const SEED_EMAILS = /@occaz\.test$/

// Communes officielles (code INSEE + un code postal valide)
const PARIS = { cityCode: '75056', postalCode: '75011' }
const LYON = { cityCode: '69123', postalCode: '69003' }
const MARSEILLE = { cityCode: '13055', postalCode: '13001' }
const TOULOUSE = { cityCode: '31555', postalCode: '31000' }
const BORDEAUX = { cityCode: '33063', postalCode: '33000' }
const LILLE = { cityCode: '59350', postalCode: '59000' }
const NANTES = { cityCode: '44109', postalCode: '44000' }

type Seed = Omit<ListingCreateInput, 'cityCode' | 'postalCode'> & { at: { cityCode: string; postalCode: string }; daysAgo: number; sold?: boolean }
const euros = (n: number) => Math.round(n * 100)

const ACCOUNTS: Record<string, Seed[]> = {
  'alice@occaz.test': [
    { title: 'Vélo de ville Peugeot, taille M', priceCents: euros(85), category: 'loisirs', at: LYON, daysAgo: 1,
      description: 'Très bon état, peu servi.\nCadre aluminium taille M (1m65 à 1m80), 7 vitesses, freins révisés en septembre.\nLivré avec antivol et garde-boue.' },
    { title: 'Lampe de bureau vintage en laiton', priceCents: euros(25), category: 'maison', at: LYON, daysAgo: 3,
      description: 'Lampe articulée des années 70, ampoule E27 fournie. Quelques traces d’usage sur le pied.' },
    { title: 'Casque de vélo adulte, taille L', priceCents: euros(15), category: 'loisirs', at: LYON, daysAgo: 6,
      description: 'Jamais tombé, réglage molette.' },
    { title: 'Robe d’été fleurie, taille 38', priceCents: euros(12), category: 'mode', at: LYON, daysAgo: 9 },
    { title: 'Machine à café expresso', priceCents: euros(60), category: 'maison', at: LYON, daysAgo: 20, sold: true,
      description: 'Vendue, merci !' },
  ],
  'bruno@occaz.test': [
    { title: 'iPhone 13, 128 Go, bleu', priceCents: euros(390), category: 'multimedia', at: PARIS, daysAgo: 0,
      description: 'Batterie à 88 %, aucune rayure sur l’écran, vendu avec coque et câble.\nFacture disponible.' },
    { title: 'Écran PC 27 pouces 144 Hz', priceCents: euros(140), category: 'multimedia', at: PARIS, daysAgo: 2,
      description: 'Dalle IPS, aucun pixel mort. Câble DisplayPort fourni.' },
    { title: 'Appartement T2 lumineux, 45 m²', priceCents: euros(310_000), category: 'immobilier', at: PARIS, daysAgo: 4,
      description: 'T2 au 3e étage avec ascenseur, séjour plein sud, cuisine équipée, cave.\nÀ 5 minutes du métro.' },
    { title: 'Console de jeux portable + 3 jeux', priceCents: euros(180), category: 'multimedia', at: PARIS, daysAgo: 7 },
    { title: 'Trottinette électrique 25 km/h', priceCents: euros(220), category: 'loisirs', at: PARIS, daysAgo: 11,
      description: 'Autonomie environ 20 km, pneus neufs, chargeur fourni.' },
  ],
  'chloe@occaz.test': [
    { title: 'Peugeot 208 essence, 2019, 62 000 km', priceCents: euros(11_900), category: 'vehicules', at: MARSEILLE, daysAgo: 1,
      description: 'Première main, carnet d’entretien à jour, contrôle technique OK.\nClimatisation, GPS, radar de recul.' },
    { title: 'Canapé 3 places en velours vert', priceCents: euros(250), category: 'maison', at: MARSEILLE, daysAgo: 5,
      description: 'Dimensions 210 × 90 cm. Housse lavable. À venir chercher (3e étage sans ascenseur).' },
    { title: 'Raquettes de tennis (lot de 2)', priceCents: euros(30), category: 'loisirs', at: MARSEILLE, daysAgo: 8 },
    { title: 'Veste en jean, taille M', priceCents: euros(18), category: 'mode', at: MARSEILLE, daysAgo: 13 },
  ],
  'david@occaz.test': [
    { title: 'Scooter 125 cm³, 2021', priceCents: euros(2_300), category: 'vehicules', at: TOULOUSE, daysAgo: 2,
      description: '8 500 km, entretien chez le concessionnaire, top case offert.' },
    { title: 'Bibliothèque en chêne massif', priceCents: euros(120), category: 'maison', at: BORDEAUX, daysAgo: 4,
      description: '5 étagères, 180 × 80 cm. Démontable pour le transport.' },
    { title: 'Appareil photo hybride + objectif 18-55', priceCents: euros(450), category: 'multimedia', at: TOULOUSE, daysAgo: 6,
      description: '12 000 déclenchements, deux batteries, sac de transport.' },
    { title: 'Lot de 20 livres de poche', priceCents: euros(20), category: 'autre', at: BORDEAUX, daysAgo: 10 },
    { title: 'Montre de collection, édition limitée', priceCents: euros(12_500), category: 'mode', at: TOULOUSE, daysAgo: 15,
      description: 'Boîte et certificat d’origine. Prix au-dessus de 10 000 € : pas d’achat en ligne.' },
  ],
  'emma@occaz.test': [
    { title: 'Poussette 3 en 1', priceCents: euros(160), category: 'autre', at: NANTES, daysAgo: 1,
      description: 'Nacelle, siège auto et poussette. Très bon état, non-fumeurs.' },
    { title: 'Guitare acoustique avec housse', priceCents: euros(120), category: 'loisirs', at: LILLE, daysAgo: 3,
      description: 'Cordes changées récemment, accordeur offert.' },
    { title: 'Table basse scandinave', priceCents: euros(45), category: 'maison', at: NANTES, daysAgo: 5 },
    { title: 'Baskets running, pointure 39', priceCents: euros(35), category: 'mode', at: LILLE, daysAgo: 12,
      description: 'Portées trois fois, trop petites pour moi.' },
  ],
}

// Favoris de démonstration : emma suit quelques annonces des autres
const FAVORITES_OF = { 'emma@occaz.test': ['Vélo de ville Peugeot, taille M', 'iPhone 13, 128 Go, bleu', 'Canapé 3 places en velours vert'] }

try {
  process.loadEnvFile()
} catch {
  // pas de .env
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI manquant')
await mongoose.connect(process.env.MONGODB_URI)

// 1. Nettoyage des données d'un précédent seed (uniquement les comptes @occaz.test)
const previous = await User.find({ email: SEED_EMAILS })
for (const user of previous) {
  const ownerId = String(user._id)
  for (const listing of await Listing.find({ ownerId })) await listingService.remove(ownerId, String(listing._id))
  await Favorite.deleteMany({ userId: user._id })
  await Purchase.deleteMany({ buyerId: user._id })
}
await User.deleteMany({ email: SEED_EMAILS })

// 2. Comptes et annonces, créés par les mêmes services que l'API (communes vérifiées, mot de passe haché)
const ids = new Map<string, string>()
const titles = new Map<string, string>()
for (const [email, seeds] of Object.entries(ACCOUNTS)) {
  const { user } = await register({ email, password: PASSWORD })
  ids.set(email, user.id)
  for (const { at, daysAgo, sold, ...data } of seeds) {
    const listing = await listingService.create(user.id, { ...data, ...at })
    titles.set(data.title, String(listing._id))
    // Dates étalées pour une vitrine réaliste (tri, « Publiée le »)
    const date = new Date(Date.now() - daysAgo * 86_400_000 - Math.random() * 36e5)
    await Listing.collection.updateOne({ _id: listing._id }, { $set: { createdAt: date, updatedAt: date, ...(sold && { status: 'sold' }) } })
  }
}

for (const [email, favorites] of Object.entries(FAVORITES_OF)) {
  for (const title of favorites) await favoriteService.add(ids.get(email) as string, titles.get(title) as string)
}

const total = Object.values(ACCOUNTS).reduce((n, seeds) => n + seeds.length, 0)
console.log(`${ids.size} comptes et ${total} annonces créés (mot de passe commun : ${PASSWORD})`)
for (const [email, seeds] of Object.entries(ACCOUNTS)) console.log(`  ${email.padEnd(18)} ${seeds.length} annonces`)
await mongoose.disconnect()
