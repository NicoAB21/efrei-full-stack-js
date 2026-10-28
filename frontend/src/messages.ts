import { apiFetch } from './api'

// Messagerie privée (US5) : une conversation par couple acheteur–annonce.
export const MAX_MESSAGE_LENGTH = 1000

export type ChatMessage = { id: string; body: string; createdAt: string; mine: boolean }

export type Conversation = {
  id: string
  role: 'buyer' | 'seller'
  other: { label: string; role: 'buyer' | 'seller' }
  /** Annonce d'origine : titre, photo et prix figés au premier message */
  listing: { id: string; title: string; photoUrl: string | null; priceCents: number; status: 'available' | 'sold' | 'deleted' }
  lastMessage: { body: string; at: string; mine: boolean } | null
  unread: number
}

export type ConversationDetail = Conversation & { otherReadAt: string | null; messages: ChatMessage[] }

const post = (body: string) => ({ method: 'POST', body: JSON.stringify({ body }) })

export const sendFirstMessage = (listingId: string, body: string) =>
  apiFetch<{ conversationId: string; message: ChatMessage }>(`/public/listings/${listingId}/messages`, post(body))
export const replyMessage = (id: string, body: string) => apiFetch<ChatMessage>(`/conversations/${id}/messages`, post(body))
export const fetchConversations = async () => (await apiFetch<{ items: Conversation[] }>('/conversations')).items
export const fetchConversation = (id: string) => apiFetch<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`)
export const markRead = (id: string) => apiFetch<void>(`/conversations/${id}/read`, { method: 'POST' })
export const fetchUnread = async () => (await apiFetch<{ count: number }>('/conversations/unread')).count
