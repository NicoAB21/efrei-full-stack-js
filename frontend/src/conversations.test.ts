import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupByListing, type ReceivedMessage } from './conversations.ts'

const message = (id: string, listingId: string, listingTitle: string | null): ReceivedMessage => ({
  id,
  listingId,
  listingTitle,
  senderId: 's',
  recipientId: 'r',
  body: `Message ${id}`,
  createdAt: '2026-10-28T10:00:00.000Z',
})

test('groupByListing', () => {
  const groups = groupByListing([message('3', 'velo', 'Vélo'), message('2', 'lampe', null), message('1', 'velo', 'Vélo')])

  assert.deepEqual(
    groups.map((g) => [g.listingId, g.listingTitle, g.messages.map((m) => m.id)]),
    [
      ['velo', 'Vélo', ['3', '1']],
      ['lampe', null, ['2']],
    ],
  )
  assert.deepEqual(groupByListing([]), [])
})
