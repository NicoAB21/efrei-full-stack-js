// Spec 004 : communes fiables. Tests sur le vrai référentiel (data/communes.json), sans réseau.
import request from 'supertest'
import { createApp } from '../src/app.js'
import { checkLocation, communesByName, findCommune, normalize } from '../src/communes/index.js'

const app = createApp()

describe('référentiel', () => {
  test('normalisation : casse, accents, tirets et apostrophes ignorés', () => {
    expect(normalize('Saint-Étienne')).toBe('saint etienne')
    expect(normalize('  SAINT   ETIENNE ')).toBe('saint etienne')
    expect(normalize("L'Haÿ-les-Roses")).toBe('l hay les roses')
  })

  test('Paris, Lyon, Marseille : une commune, plusieurs codes postaux', () => {
    expect(findCommune('75056')?.postalCodes).toHaveLength(21)
    expect(findCommune('69123')?.postalCodes).toHaveLength(9)
    expect(findCommune('13055')?.postalCodes).toHaveLength(16)
  })

  test('couple commune / code postal vérifié', () => {
    expect(checkLocation('69123', '69003')?.name).toBe('Lyon')
    expect(checkLocation('69123', '75001')).toBeNull()
    expect(checkLocation('99999', '69003')).toBeNull()
  })

  test('homonymes et outre-mer', () => {
    expect(communesByName('saint-denis').map((c) => c.department).sort()).toEqual(['11', '30', '93', '974'])
    expect(findCommune('97411')?.name).toBe('Saint-Denis')
  })
})

describe('US1 : GET /api/communes (suggestions)', () => {
  const suggest = (q?: string) => request(app).get('/api/communes').query(q === undefined ? {} : { q })

  test('« lyo » : Lyon et ses codes postaux en tête, sans token', async () => {
    const res = await suggest('lyo')
    expect(res.status).toBe(200)
    expect(res.body.items.slice(0, 9).map((s: { label: string }) => s.label)).toEqual(
      ['69001', '69002', '69003', '69004', '69005', '69006', '69007', '69008', '69009'].map((cp) => `Lyon (${cp})`),
    )
    expect(res.body.items[0]).toEqual({ cityCode: '69123', name: 'Lyon', postalCode: '69001', department: '69', label: 'Lyon (69001)' })
  })

  test('par code postal', async () => {
    const res = await suggest('69003')
    expect(res.body.items.map((s: { label: string }) => s.label)).toContain('Lyon (69003)')
    expect((await suggest('97400')).body.items.map((s: { label: string }) => s.label)).toContain('Saint-Denis (97400)') // La Réunion
  })

  test('accents et tirets ignorés', async () => {
    for (const q of ['saint etienne', 'SAINT-ÉTIENNE']) {
      const names = (await suggest(q)).body.items.map((s: { name: string }) => s.name)
      expect(names).toContain('Saint-Étienne')
    }
  })

  test('homonymes distingués par le département', async () => {
    const res = await suggest('saint-denis')
    const exact = res.body.items.filter((s: { name: string }) => s.name === 'Saint-Denis')
    expect(new Set(exact.map((s: { department: string }) => s.department))).toEqual(new Set(['11', '30', '93', '974']))
  })

  test('20 suggestions maximum ; q trop court ou absent → 400', async () => {
    expect((await suggest('sa')).body.items.length).toBeLessThanOrEqual(20)
    expect((await suggest('a')).status).toBe(400)
    expect((await suggest()).status).toBe(400)
  })
})

describe('US2 : le serveur refuse les communes inventées', () => {
  let token: string
  beforeEach(async () => {
    token = (await request(app).post('/api/auth/register').send({ email: 'v@example.test', password: 'motdepasse' })).body.token
  })
  const create = (body: object) =>
    request(app).post('/api/listings').set('Authorization', `Bearer ${token}`).send({ title: 'Vélo', priceCents: 8500, category: 'loisirs', ...body })

  test.each([
    ['commune inexistante', { cityCode: '99999', postalCode: '69003' }],
    ["code postal d'une autre commune", { cityCode: '69123', postalCode: '75001' }],
    ['city en texte libre', { city: 'Lyon' }],
    ['cityCode sans postalCode', { cityCode: '69123' }],
    ['postalCode sans cityCode', { postalCode: '69003' }],
    ['cityCode mal formé', { cityCode: 'Lyon', postalCode: '69003' }],
  ])('%s → 400', async (_label, location) => {
    const res = await create(location)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
  })

  test('couple valide → 201, nom officiel enregistré, cityKey jamais renvoyé', async () => {
    const res = await create({ cityCode: '69123', postalCode: '69003' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(expect.objectContaining({ city: 'Lyon', cityCode: '69123', postalCode: '69003' }))
    expect(res.body).not.toHaveProperty('cityKey')
  })

  test('PATCH vers une autre commune → nom officiel mis à jour ; un seul des deux champs → 400', async () => {
    const { id } = (await create({ cityCode: '69123', postalCode: '69003' })).body
    const patch = (body: object) => request(app).patch(`/api/listings/${id}`).set('Authorization', `Bearer ${token}`).send(body)
    const moved = await patch({ cityCode: '42218', postalCode: '42000' })
    expect(moved.status).toBe(200)
    expect(moved.body.city).toBe('Saint-Étienne')
    expect((await patch({ postalCode: '42100' })).status).toBe(400)
  })
})
