import request from 'supertest'
import { createApp } from '../src/app.js'

const app = createApp()

test('GET /api/health → 200 {"status":"ok"}', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})

test('route /api inconnue → 404 NOT_FOUND', async () => {
  const res = await request(app).get('/api/inconnue')
  expect(res.status).toBe(404)
  expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } })
})

test('JSON mal formé → 400 INVALID_INPUT', async () => {
  const res = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{"pas du json')
  expect(res.status).toBe(400)
  expect(res.body).toEqual({ error: { code: 'INVALID_INPUT', message: expect.any(String) } })
})

test('GET /api/docs sert Swagger UI', async () => {
  const res = await request(app).get('/api/docs/')
  expect(res.status).toBe(200)
  expect(res.text).toContain('swagger')
})
