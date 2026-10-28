import request from 'supertest'
import { Types } from 'mongoose'
import { createApp } from '../src/app.js'
import { Listing } from '../src/models/listing.js'

const app = createApp()
const base = { title: 'Vélo', description: 'Très bon état', priceCents: 8500, category: 'loisirs', city: 'Lyon' }
const create = (overrides: object = {}) => Listing.create({ ...base, ownerId: new Types.ObjectId(), ...overrides })

test('liste publique : tous les vendeurs, disponibles seulement, ordre et aucune donnée privée', async () => {
  const older = await create({ createdAt: new Date('2026-01-01') })
  const newer = await create({ createdAt: new Date('2026-02-01') })
  await create({ status: 'sold' })
  const res = await request(app).get('/api/public/listings').expect(200)
  expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([newer.id, older.id])
  for (const item of res.body.items) {
    expect(Object.keys(item).sort()).toEqual(['id', 'ownerId', 'title', 'description', 'priceCents', 'category', 'city', 'cityCode', 'postalCode', 'status', 'createdAt', 'updatedAt', 'photos'].sort())
  }
})

test('limite de 50 annonces, après filtrage', async () => {
  await Listing.insertMany(Array.from({ length: 55 }, (_, index) => ({ ...base, ownerId: new Types.ObjectId(), createdAt: new Date(2026, 0, index + 1) })))
  const res = await request(app).get('/api/public/listings').expect(200)
  expect(res.body.items).toHaveLength(50)
  expect(new Date(res.body.items[0].createdAt).getTime()).toBeGreaterThan(new Date(res.body.items[49].createdAt).getTime())
})

test('filtres cumulés, prix inclusifs et recherche dans la description', async () => {
  const match = await create({ title: 'Bicyclette', description: 'Un VÉLO pliant' })
  await create({ category: 'maison' })
  await create({ city: 'Paris' })
  await create({ priceCents: 8501 })
  await create({ priceCents: 8499 })
  const res = await request(app).get('/api/public/listings').query({ category: 'loisirs', city: 'lYoN', q: 'vélo', minPrice: 8500, maxPrice: 8500 }).expect(200)
  expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([match.id])
})

// Les annonces créées directement en base ci-dessus n'ont pas de cityCode : ce sont des « anciennes » annonces
// en texte libre, retrouvées par le repli sur le texte de la ville.
test('mot-clé et ville traitent les caractères regex comme du texte', async () => {
  const match = await create({ title: 'Lot [.*] + accessoires', city: 'Paris (centre)' })
  await create({ title: 'Autre lot', city: 'Paris centre' })
  const res = await request(app).get('/api/public/listings').query({ q: '[.*]', city: '(centre)' }).expect(200)
  expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([match.id])
})

test.each([
  { category: 'inconnue' }, { minPrice: '1.5' }, { maxPrice: 'abc' }, { minPrice: 0 },
  { minPrice: -1 }, { maxPrice: '9007199254740992' }, { city: 'x'.repeat(81) }, { cityCode: 'Lyon' },
  { q: 'x'.repeat(101) }, { other: 'x' }, { minPrice: 200, maxPrice: 100 },
  { minPrice: '' }, { category: ['loisirs', 'maison'] },
])('refuse les filtres invalides %j', async (query) => {
  const res = await request(app).get('/api/public/listings').query(query).expect(400)
  expect(res.body.error.code).toBe('INVALID_INPUT')
})

test('détail public disponible, vendue ou absente → 404, id invalide → 400', async () => {
  const listing = await create()
  const res = await request(app).get(`/api/public/listings/${listing.id}`).expect(200)
  expect(res.body.title).toBe(base.title)
  expect(res.body).not.toHaveProperty('email')
  expect(res.body).not.toHaveProperty('passwordHash')
  await Listing.updateOne({ _id: listing._id }, { status: 'sold' })
  await request(app).get(`/api/public/listings/${listing.id}`).expect(404)
  await request(app).get(`/api/public/listings/${new Types.ObjectId()}`).expect(404)
  await request(app).get('/api/public/listings/abc').expect(400)
})

test('recherche sans résultat et routes privées toujours protégées', async () => {
  await request(app).get('/api/public/listings').expect(200, { items: [] })
  const id = new Types.ObjectId().toString()
  await request(app).get('/api/listings').expect(401)
  await request(app).post('/api/listings').send(base).expect(401)
  await request(app).get(`/api/listings/${id}`).expect(401)
  await request(app).patch(`/api/listings/${id}`).send({ title: 'Autre' }).expect(401)
  await request(app).delete(`/api/listings/${id}`).expect(401)
})

describe('spec 004 : recherche par commune', () => {
  // Annonces rattachées comme le ferait l'API (nom officiel + clé normalisée)
  const inCommune = (cityCode: string, postalCode: string, city: string, cityKey: string, title = 'Vélo') =>
    create({ title, cityCode, postalCode, city, cityKey })

  test('city=lyon, LYON ou cityCode : toutes les annonces de Lyon, tous codes postaux', async () => {
    const a = await inCommune('69123', '69001', 'Lyon', 'lyon')
    const b = await inCommune('69123', '69003', 'Lyon', 'lyon')
    await inCommune('42218', '42000', 'Saint-Étienne', 'saint etienne')
    for (const query of [{ city: 'lyon' }, { city: 'LYON' }, { cityCode: '69123' }]) {
      const res = await request(app).get('/api/public/listings').query(query).expect(200)
      expect(res.body.items.map((i: { id: string }) => i.id).sort()).toEqual([a.id, b.id].sort())
    }
  })

  test('accents et tirets ignorés : « saint-étienne » trouve Saint-Étienne, pas Saint-Étienne-de-…', async () => {
    const se = await inCommune('42218', '42000', 'Saint-Étienne', 'saint etienne')
    await inCommune('38441', '38590', 'Saint-Étienne-de-Saint-Geoirs', 'saint etienne de saint geoirs')
    const res = await request(app).get('/api/public/listings').query({ city: 'saint-étienne' }).expect(200)
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([se.id])
  })

  test('ville et mot-clé se cumulent (ET, pas OU)', async () => {
    const match = await inCommune('69123', '69001', 'Lyon', 'lyon', 'Vélo de ville')
    await inCommune('69123', '69002', 'Lyon', 'lyon', 'Canapé')
    await inCommune('42218', '42000', 'Saint-Étienne', 'saint etienne', 'Vélo de course')
    const res = await request(app).get('/api/public/listings').query({ city: 'lyon', q: 'vélo' }).expect(200)
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([match.id])
  })
})
