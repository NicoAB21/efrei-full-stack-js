import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lastSentStatus, shortDate } from './conversations.ts'

const msg = (id: string, mine: boolean, createdAt: string) => ({ id, body: id, mine, createdAt })

test('lastSentStatus : « Vu » seulement si l’autre a lu après mon dernier message', () => {
  const messages = [msg('a', true, '2026-10-28T10:00:00Z'), msg('b', false, '2026-10-28T10:05:00Z'), msg('c', true, '2026-10-28T10:10:00Z')]
  assert.deepEqual(lastSentStatus(messages, null), { id: 'c', seen: false })
  assert.deepEqual(lastSentStatus(messages, '2026-10-28T10:06:00Z'), { id: 'c', seen: false })
  assert.deepEqual(lastSentStatus(messages, '2026-10-28T10:10:00Z'), { id: 'c', seen: true })
  assert.equal(lastSentStatus([msg('b', false, '2026-10-28T10:05:00Z')], null), null)
})

test('shortDate : heure aujourd’hui, « Hier », sinon le jour', () => {
  const now = new Date(2026, 9, 28, 15, 0)
  assert.match(shortDate(new Date(2026, 9, 28, 9, 5).toISOString(), now), /^09:05$/)
  assert.equal(shortDate(new Date(2026, 9, 27, 22, 0).toISOString(), now), 'Hier')
  assert.match(shortDate(new Date(2026, 9, 12, 8, 0).toISOString(), now), /^12 oct\.$/)
})
