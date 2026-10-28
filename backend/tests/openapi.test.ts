// La doc Swagger (openapi.yaml) ne doit décrire que des routes qui existent vraiment.
import { readFileSync } from 'node:fs'
import request from 'supertest'
import { parse } from 'yaml'
import { createApp } from '../src/app.js'

const app = createApp()
const doc = parse(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'))
const METHODS = ['get', 'post', 'patch', 'delete'] as const

const documented = Object.entries(doc.paths as Record<string, Record<string, unknown>>).flatMap(([path, ops]) =>
  METHODS.filter((m) => m in ops).map((method) => [method, path] as const),
)

test('la doc décrit au moins les routes du contrat', () => {
  expect(documented.length).toBeGreaterThanOrEqual(7)
})

test.each(documented)('%s %s existe dans l’API', async (method, path) => {
  // id valide mais inexistant : la route doit répondre autre chose que « Route inconnue »
  const url = path.replace('{id}', '0123456789abcdef01234567')
  const res = await request(app)[method](url)
  expect(res.body?.error?.message).not.toBe('Route inconnue')
})
