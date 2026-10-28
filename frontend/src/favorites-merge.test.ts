import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_FAVORITES, parseLocalFavorites } from './favorites-merge.ts'

const id = (n: number) => n.toString(16).padStart(24, '0')

test('contenu absent ou illisible → []', () => {
  assert.deepEqual(parseLocalFavorites(null), [])
  assert.deepEqual(parseLocalFavorites('pas du json'), [])
  assert.deepEqual(parseLocalFavorites('{"a":1}'), [])
})

test('garde les ids valides, sans doublon, dans l’ordre', () => {
  assert.deepEqual(parseLocalFavorites(JSON.stringify([id(1), 'abc', 42, id(2), id(1), null])), [id(1), id(2)])
})

test(`plafonne à ${MAX_FAVORITES}`, () => {
  const many = Array.from({ length: 250 }, (_, i) => id(i + 1))
  assert.equal(parseLocalFavorites(JSON.stringify(many)).length, MAX_FAVORITES)
})
