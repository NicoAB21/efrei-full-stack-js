import type { ChatMessage } from './messages'

// Logique pure de la messagerie, testée avec node --test.

/** Mon dernier message et s'il a été vu (l'autre a lu après son envoi), pour la mention « Vu ». */
export function lastSentStatus(messages: ChatMessage[], otherReadAt: string | null) {
  const last = messages.findLast((m) => m.mine)
  if (!last) return null
  return { id: last.id, seen: otherReadAt !== null && Date.parse(otherReadAt) >= Date.parse(last.createdAt) }
}

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** « 14:05 » aujourd'hui, « Hier », sinon « 12 oct. » (liste des conversations). */
export function shortDate(iso: string, now = new Date()) {
  const date = new Date(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (date.getTime() >= startOfToday) return time.format(date)
  if (date.getTime() >= startOfToday - 86_400_000) return 'Hier'
  return day.format(date)
}
