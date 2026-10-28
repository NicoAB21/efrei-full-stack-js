import { apiFetch } from './api'
import type { Message, ReceivedMessage } from './conversations'

export const MAX_MESSAGE_LENGTH = 1000

export const sendMessage = (listingId: string, body: string) =>
  apiFetch<Message>(`/public/listings/${listingId}/messages`, { method: 'POST', body: JSON.stringify({ body }) })

export const fetchReceivedMessages = async () => (await apiFetch<{ items: ReceivedMessage[] }>('/messages')).items
