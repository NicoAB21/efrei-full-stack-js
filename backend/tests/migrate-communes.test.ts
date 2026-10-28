// Spec 004, US4 : rattachement des anciennes annonces (ville en texte libre) à une commune officielle.
import { Types } from 'mongoose'
import { migrateCommunes } from '../src/communes/migrate.js'
import { Listing } from '../src/models/listing.js'

const legacy = (city: string) =>
  Listing.create({ ownerId: new Types.ObjectId(), title: `Objet à ${city}`, priceCents: 100, category: 'autre', city })

test('rattache les villes sans ambiguïté, laisse les autres, et peut être relancé', async () => {
  const lyon = await legacy('lyon')
  const stEtienne = await legacy('Saint-Etienne')
  const sens = await legacy('SENS') // commune à un seul code postal
  const stDenis = await legacy('Saint-Denis') // 4 communes de ce nom
  const typo = await legacy('Lyonnn')

  expect(await migrateCommunes()).toEqual({ attached: 3, left: 2 })

  const get = async (id: unknown) => (await Listing.findById(id))!.toObject()
  expect(await get(lyon._id)).toEqual(expect.objectContaining({ cityCode: '69123', city: 'Lyon', cityKey: 'lyon', postalCode: null }))
  expect(await get(stEtienne._id)).toEqual(expect.objectContaining({ cityCode: '42218', city: 'Saint-Étienne' }))
  expect(await get(sens._id)).toEqual(expect.objectContaining({ city: 'Sens', postalCode: '89100' }))
  expect(await get(stDenis._id)).toEqual(expect.objectContaining({ cityCode: null, city: 'Saint-Denis' }))
  expect(await get(typo._id)).toEqual(expect.objectContaining({ cityCode: null, city: 'Lyonnn' }))

  // Relancer ne change rien : les annonces rattachées ne sont plus concernées
  expect(await migrateCommunes()).toEqual({ attached: 0, left: 2 })
})
