// Lancer : npm test (runner natif de Node, aucune dépendance)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatPrice, parsePrice } from './price.ts'

// Intl met une espace insécable fine avant « € »
const plain = (s: string) => s.replace(/\s/g, ' ')

test('formatPrice', () => {
  assert.equal(plain(formatPrice(12345)), '123,45 €')
  assert.equal(plain(formatPrice(8500)), '85,00 €')
  assert.equal(plain(formatPrice(1)), '0,01 €')
})

test('parsePrice', () => {
  assert.equal(parsePrice('85'), 8500)
  assert.equal(parsePrice('85,5'), 8550)
  assert.equal(parsePrice('85.50'), 8550)
  assert.equal(parsePrice('1 200,00'), 120000)
  assert.equal(parsePrice('0,01'), 1)
  assert.equal(parsePrice('19,99'), 1999) // pas d'erreur d'arrondi flottant
  for (const bad of ['', '0', '0,00', '-5', '12,345', 'abc', '1e3', '99999999999999999']) {
    assert.equal(parsePrice(bad), null, bad)
  }
})
