// Spec 003 : photos des annonces. Images générées par sharp pendant le test, dossier UPLOADS_DIR temporaire.
import { readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import request from 'supertest'
import { createApp } from '../src/app.js'

const app = createApp()

type Account = { id: string; token: string }
type Photo = { id: string; url: string; cardUrl: string; width: number; height: number }

async function register(email: string): Promise<Account> {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'motdepasse' })
  return { id: res.body.user.id, token: res.body.token }
}
const as = (a: Account) => ({ Authorization: `Bearer ${a.token}` })
async function publish(a: Account, title = 'Vélo de ville') {
  const res = await request(app).post('/api/listings').set(as(a)).send({ title, priceCents: 8500, category: 'loisirs', city: 'Lyon' })
  return res.body.id as string
}

const image = (format: 'jpeg' | 'png' | 'webp', width = 300, height = 200) =>
  sharp({ create: { width, height, channels: 3, background: '#c2410c' } })[format]().toBuffer()
const jpegWithGps = () =>
  sharp({ create: { width: 300, height: 200, channels: 3, background: '#1e293b' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'Telephone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '45/1 45/1 0/1' } })
    .toBuffer()
const hasGpsTag = (exif?: Buffer) => Boolean(exif && (exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88]))))

type File = { buffer: Buffer; name: string }
const upload = (a: Account, listingId: string, files: File[]) => {
  const req = request(app).post(`/api/listings/${listingId}/photos`).set(as(a))
  for (const f of files) req.attach('photos', f.buffer, f.name)
  return req
}
const filesOnDisk = () => readdirSync(process.env.UPLOADS_DIR as string).length
const fetchFile = (url: string) =>
  request(app).get(url).buffer(true).parse((res, cb) => {
    const chunks: Buffer[] = []
    res.on('data', (c: Buffer) => chunks.push(c))
    res.on('end', () => cb(null, Buffer.concat(chunks)))
  })

let alice: Account
let bob: Account
let listingId: string

beforeEach(async () => {
  const dir = process.env.UPLOADS_DIR as string
  for (const f of readdirSync(dir)) rmSync(path.join(dir, f), { force: true })
  alice = await register('alice@example.test')
  bob = await register('bob@example.test')
  listingId = await publish(alice)
})

describe('US1 : ajouter des photos', () => {
  test('2 photos → 201, la première est principale, fichiers servis en WebP', async () => {
    const res = await upload(alice, listingId, [
      { buffer: await image('jpeg'), name: 'velo.jpg' },
      { buffer: await image('png'), name: 'velo.png' },
    ])
    expect(res.status).toBe(201)
    expect(res.body.photos).toHaveLength(2)
    const [cover] = res.body.photos as Photo[]
    expect(cover).toEqual({ id: expect.any(String), url: expect.stringMatching(/^\/uploads\/.+-1600\.webp$/), cardUrl: expect.stringMatching(/^\/uploads\/.+-480\.webp$/), width: 300, height: 200 })
    expect(filesOnDisk()).toBe(4) // 2 tailles par photo

    const served = await fetchFile(cover.cardUrl)
    expect(served.status).toBe(200)
    expect(served.headers['content-type']).toBe('image/webp')
    expect(served.headers['x-content-type-options']).toBe('nosniff')
    expect((await sharp(served.body).metadata()).format).toBe('webp')
  })

  test('5 photos maximum par annonce : la 6e → 400', async () => {
    const five = await Promise.all([1, 2, 3, 4, 5].map(async (i) => ({ buffer: await image('webp'), name: `p${i}.webp` })))
    expect((await upload(alice, listingId, five)).status).toBe(201)
    const sixth = await upload(alice, listingId, [{ buffer: await image('jpeg'), name: 'p6.jpg' }])
    expect(sixth.status).toBe(400)
    expect(sixth.body.error.message).toMatch(/5 photos/)
  })

  test('aucun fichier → 400, sans token → 401', async () => {
    expect((await request(app).post(`/api/listings/${listingId}/photos`).set(as(alice))).status).toBe(400)
    const anon = await request(app).post(`/api/listings/${listingId}/photos`).attach('photos', await image('jpeg'), 'a.jpg')
    expect(anon.status).toBe(401)
  })
})

describe('US4 : sécurité des photos', () => {
  test.each([
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image.svg'],
    ['GIF', Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'latin1'), 'anim.gif'],
    ['PDF', Buffer.from('%PDF-1.4\n%fake'), 'doc.pdf'],
    ['texte renommé en .jpg', Buffer.from('ceci n’est pas une image'), 'faux.jpg'],
  ])('%s → 400, rien d’écrit', async (_label, buffer, name) => {
    const res = await upload(alice, listingId, [{ buffer, name }])
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_INPUT')
    expect(filesOnDisk()).toBe(0)
  })

  test('plus de 5 Mo → 400 avec la taille maximale', async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(6 * 1024 * 1024)])
    const res = await upload(alice, listingId, [{ buffer: big, name: 'enorme.jpg' }])
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/5 Mo/)
  })

  test('envoi mixte (1 valide + 1 SVG) → 400, annonce et disque inchangés', async () => {
    const res = await upload(alice, listingId, [
      { buffer: await image('jpeg'), name: 'ok.jpg' },
      { buffer: Buffer.from('<svg/>'), name: 'ko.svg' },
    ])
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/ko\.svg/)
    const listing = await request(app).get(`/api/listings/${listingId}`).set(as(alice))
    expect(listing.body.photos).toEqual([])
    expect(filesOnDisk()).toBe(0)
  })

  test('position GPS retirée et orientation appliquée', async () => {
    const source = await jpegWithGps()
    expect(hasGpsTag((await sharp(source).metadata()).exif)).toBe(true) // la photo envoyée contient bien un GPS
    const portrait = await sharp({ create: { width: 300, height: 100, channels: 3, background: '#000' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer()

    const res = await upload(alice, listingId, [
      { buffer: source, name: 'telephone.jpg' },
      { buffer: portrait, name: 'portrait.jpg' },
    ])
    const [withGps, rotated] = res.body.photos as Photo[]
    for (const url of [withGps.url, withGps.cardUrl]) {
      const meta = await sharp((await fetchFile(url)).body).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
    }
    expect([rotated.width, rotated.height]).toEqual([100, 300])
  })

  test('isolation : B ne peut pas ajouter de photo à l’annonce de A (404)', async () => {
    const res = await upload(bob, listingId, [{ buffer: await image('jpeg'), name: 'b.jpg' }])
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect((await request(app).get(`/api/listings/${listingId}`).set(as(alice))).body.photos).toEqual([])
    expect(filesOnDisk()).toBe(0)
  })
})

describe('US2 : photos visibles partout', () => {
  test('vitrine, détail public et favoris renvoient les photos ; sans photo → []', async () => {
    const other = await publish(alice, 'Lampe')
    await upload(alice, listingId, [{ buffer: await image('jpeg'), name: 'v.jpg' }])
    const vitrine = await request(app).get('/api/public/listings')
    const byTitle = Object.fromEntries(vitrine.body.items.map((l: { title: string; photos: Photo[] }) => [l.title, l.photos]))
    expect(byTitle['Vélo de ville']).toHaveLength(1)
    expect(byTitle.Lampe).toEqual([])
    expect((await request(app).get(`/api/public/listings/${listingId}`)).body.photos).toHaveLength(1)

    await request(app).put(`/api/favorites/${listingId}`).set(as(bob))
    expect((await request(app).get('/api/favorites').set(as(bob))).body.items[0].photos).toHaveLength(1)
    expect((await request(app).get(`/api/public/listings/${other}`)).body.photos).toEqual([])
  })
})

describe('US3 : organiser ses photos', () => {
  let photos: Photo[]
  beforeEach(async () => {
    const res = await upload(alice, listingId, await Promise.all(['a', 'b', 'c'].map(async (n) => ({ buffer: await image('jpeg'), name: `${n}.jpg` }))))
    photos = res.body.photos
  })
  const reorder = (a: Account, body: object) => request(app).patch(`/api/listings/${listingId}/photos`).set(as(a)).send(body)
  const removePhoto = (a: Account, photoId: string) => request(app).delete(`/api/listings/${listingId}/photos/${photoId}`).set(as(a))

  test('réordonner : la nouvelle première devient principale', async () => {
    const order = [photos[2].id, photos[0].id, photos[1].id]
    const res = await reorder(alice, { order })
    expect(res.status).toBe(200)
    expect(res.body.photos.map((p: Photo) => p.id)).toEqual(order)
  })

  test.each([
    ['id manquant', (p: Photo[]) => ({ order: [p[0].id, p[1].id] })],
    ['id inconnu', (p: Photo[]) => ({ order: [p[0].id, p[1].id, '6f1c2e3a-0000-4000-8000-000000000000'] })],
    ['doublon', (p: Photo[]) => ({ order: [p[0].id, p[0].id, p[1].id] })],
    ['champ en trop', (p: Photo[]) => ({ order: p.map((x) => x.id), foo: 1 })],
  ])('permutation invalide (%s) → 400', async (_label, body) => {
    expect((await reorder(alice, body(photos))).status).toBe(400)
  })

  test('supprimer la principale : fichiers supprimés, la suivante devient principale', async () => {
    const res = await removePhoto(alice, photos[0].id)
    expect(res.status).toBe(200)
    expect(res.body.photos.map((p: Photo) => p.id)).toEqual([photos[1].id, photos[2].id])
    expect(filesOnDisk()).toBe(4)
    expect((await fetchFile(photos[0].url)).status).toBe(404)
  })

  test('photoId mal formé → 400, inconnu → 404', async () => {
    expect((await removePhoto(alice, 'pas-un-uuid')).status).toBe(400)
    expect((await removePhoto(alice, '6f1c2e3a-0000-4000-8000-000000000000')).status).toBe(404)
  })

  test('isolation : B ne peut ni réordonner ni supprimer (404), photos de A intactes', async () => {
    expect((await reorder(bob, { order: [photos[2].id, photos[1].id, photos[0].id] })).status).toBe(404)
    expect((await removePhoto(bob, photos[0].id)).status).toBe(404)
    const listing = await request(app).get(`/api/listings/${listingId}`).set(as(alice))
    expect(listing.body.photos.map((p: Photo) => p.id)).toEqual(photos.map((p) => p.id))
    expect(filesOnDisk()).toBe(6)
  })

  test('supprimer l’annonce supprime tous ses fichiers', async () => {
    expect((await request(app).delete(`/api/listings/${listingId}`).set(as(alice))).status).toBe(204)
    expect(filesOnDisk()).toBe(0)
  })
})
