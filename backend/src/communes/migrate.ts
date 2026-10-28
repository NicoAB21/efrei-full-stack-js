import { Listing } from '../models/listing.js'
import { communesByName, normalize } from './index.js'

/**
 * Rattache les anciennes annonces (ville en texte libre) à une commune officielle quand le nom n'en désigne
 * qu'une ; le code postal n'est posé que si la commune n'en a qu'un. Les autres restent en texte libre
 * (affichées comme avant ; leur propriétaire devra choisir une commune à la prochaine modification).
 */
export async function migrateCommunes() {
  let attached = 0
  let left = 0
  for (const listing of await Listing.find({ cityCode: null }).select('city')) {
    const matches = communesByName(listing.city)
    if (matches.length !== 1) {
      left += 1
      continue
    }
    const [commune] = matches
    await Listing.updateOne(
      { _id: listing._id, cityCode: null },
      {
        cityCode: commune.code,
        city: commune.name,
        cityKey: normalize(commune.name),
        postalCode: commune.postalCodes.length === 1 ? commune.postalCodes[0] : null,
      },
    )
    attached += 1
  }
  return { attached, left }
}
