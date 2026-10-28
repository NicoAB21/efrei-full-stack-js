import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkPhoto, MAX_PHOTO_BYTES } from './photos.ts'

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })

test('accepte JPEG, PNG et WebP sous 5 Mo', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(checkPhoto(file('a', type), 0), null)
})

test('refuse les autres formats, plus de 5 Mo et au-delà de 5 photos', () => {
  assert.match(checkPhoto(file('logo.svg', 'image/svg+xml'), 0) ?? '', /format refusé/)
  assert.match(checkPhoto(file('anim.gif', 'image/gif'), 0) ?? '', /format refusé/)
  assert.match(checkPhoto(file('gros.jpg', 'image/jpeg', MAX_PHOTO_BYTES + 1), 0) ?? '', /5 Mo/)
  assert.match(checkPhoto(file('a.jpg', 'image/jpeg'), 5) ?? '', /5 photos/)
})
