import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiFetch, ApiError, setToken } from './api.ts'

test('transport du token, erreurs de connexion et expiration de session', async () => {
  const originalFetch = globalThis.fetch
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const values = new Map<string, string>()
  let redirected = ''
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { assign: (path: string) => { redirected = path } },
  } })
  try {
    setToken('test-token')
    globalThis.fetch = async (_url, options) => {
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-token')
      return Response.json({ items: [] })
    }
    assert.deepEqual(await apiFetch('/listings'), { items: [] })

    globalThis.fetch = async (_url, options) => {
      assert.equal(new Headers(options?.headers).get('Authorization'), null)
      return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect' } }, { status: 401 })
    }
    await assert.rejects(apiFetch('/auth/login', { method: 'POST', body: '{}' }), ApiError)
    assert.equal(redirected, '')

    values.set('occaz.user', '{}')
    globalThis.fetch = async () => Response.json({ error: { code: 'UNAUTHORIZED', message: 'Session expirée' } }, { status: 401 })
    await assert.rejects(apiFetch('/listings'), ApiError)
    assert.equal(redirected, '/login?expired=1')
    assert.equal(values.has('occaz.token'), false)
    assert.equal(values.has('occaz.user'), false)
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
