import { ArrowLeft, MessageCircle, Package, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { lastSentStatus, shortDate } from '../conversations'
import { errorMessage, isNotFound } from '../listings'
import {
  fetchConversation,
  fetchConversations,
  markRead,
  MAX_MESSAGE_LENGTH,
  replyMessage,
  type Conversation,
  type ConversationDetail,
} from '../messages'
import { formatPrice } from '../price'
import { useUnread } from '../unread'

// Messagerie privée, façon grands sites entre particuliers : conversations à gauche, fil à droite
// (sur mobile, l'un ou l'autre). Pas de temps réel : la liste et le fil ouvert sont relus régulièrement.
const LIST_POLL_MS = 15_000
const THREAD_POLL_MS = 5_000

const fullDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const roleLabel = { buyer: 'Acheteur', seller: 'Vendeur' } as const

export function Messages() {
  const { id } = useParams()
  // Incrémenté à chaque envoi ou lecture dans le fil : la liste se relit
  const [version, setVersion] = useState(0)
  return (
    <div className={`inbox ${id ? 'has-thread' : ''}`}>
      <ConversationList activeId={id} version={version} />
      {id ? (
        <Thread key={id} id={id} onChange={() => setVersion((v) => v + 1)} />
      ) : (
        <div className="thread thread-empty">
          <MessageCircle size={40} aria-hidden />
          <p className="muted">Choisissez une conversation</p>
        </div>
      )}
    </div>
  )
}

function ConversationList({ activeId, version }: { activeId?: string; version: number }) {
  const [items, setItems] = useState<Conversation[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = () =>
      fetchConversations()
        .then((result) => { if (active) setItems(result) })
        .catch((cause: unknown) => { if (active) setError(errorMessage(cause)) })
    load()
    const timer = setInterval(load, LIST_POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [version])

  return (
    <section className="conv-list" aria-labelledby="conv-title">
      <h1 id="conv-title">Messages</h1>
      {error ? (
        <Alert type="error">{error}</Alert>
      ) : items === null ? (
        <p role="status" className="muted">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucune conversation" action={<Link to="/" className="btn btn-primary">Parcourir les annonces</Link>}>
          Écrivez à un vendeur depuis une annonce : la conversation apparaîtra ici.
        </EmptyState>
      ) : (
        <ul>
          {items.map((c) => (
            <li key={c.id}>
              <Link to={`/messages/${c.id}`} className={`conv-item ${c.id === activeId ? 'is-active' : ''} ${c.unread > 0 ? 'is-unread' : ''}`} aria-current={c.id === activeId ? 'page' : undefined}>
                <Thumb url={c.listing.photoUrl} size={56} />
                <span className="conv-text">
                  <span className="conv-top">
                    <strong>{c.other.label}</strong>
                    {c.lastMessage && <time dateTime={c.lastMessage.at}>{shortDate(c.lastMessage.at)}</time>}
                  </span>
                  <span className="conv-listing">{c.listing.title}</span>
                  {c.lastMessage && (
                    <span className="conv-preview">
                      {c.lastMessage.mine && 'Vous : '}
                      {c.lastMessage.body}
                    </span>
                  )}
                </span>
                {c.unread > 0 && (
                  <span className="count-badge" aria-label={`${c.unread} non lu${c.unread > 1 ? 's' : ''}`}>{c.unread}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Thumb({ url, size }: { url: string | null; size: number }) {
  return url ? (
    <img src={url} alt="" width={size} height={size} className="thumb" />
  ) : (
    <span className="thumb thumb-empty" style={{ width: size, height: size }} aria-hidden><Package size={size / 2.2} /></span>
  )
}

function Thread({ id, onChange }: { id: string; onChange: () => void }) {
  const { refresh } = useUnread()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<{ message: string; missing: boolean } | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const changed = useRef(onChange)
  const refreshUnread = useRef(refresh)
  useEffect(() => {
    changed.current = onChange
    refreshUnread.current = refresh
  })

  // Charge le fil, le relit toutes les 5 s ; dès qu'il y a du non-lu, on marque lu (pastille et liste à jour)
  useEffect(() => {
    let active = true
    const load = () =>
      fetchConversation(id)
        .then(async (result) => {
          if (!active) return
          setConversation(result)
          if (result.unread > 0) {
            await markRead(id)
            refreshUnread.current()
            changed.current()
          }
        })
        .catch((cause: unknown) => { if (active) setError({ message: errorMessage(cause), missing: isNotFound(cause) }) })
    load()
    const timer = setInterval(load, THREAD_POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [id])

  // Toujours afficher le dernier message
  const count = conversation?.messages.length ?? 0
  useEffect(() => {
    const box = scrollRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [count])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setSendError('')
    try {
      const message = await replyMessage(id, text)
      setConversation((c) => (c ? { ...c, messages: [...c.messages, message] } : c))
      setBody('')
      changed.current()
    } catch (cause) {
      setSendError(errorMessage(cause))
    } finally {
      setSending(false)
    }
  }

  // Entrée envoie, Maj + Entrée passe à la ligne
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  if (error) {
    return (
      <div className="thread">
        <Link to="/messages" className="thread-back"><ArrowLeft size={18} aria-hidden /> Conversations</Link>
        <Alert type="error">{error.missing ? 'Cette conversation n’existe pas ou ne vous concerne pas.' : error.message}</Alert>
      </div>
    )
  }
  if (!conversation) return <div className="thread"><p role="status" className="muted">Chargement de la conversation…</p></div>

  const { listing } = conversation
  const status = lastSentStatus(conversation.messages, conversation.otherReadAt)

  return (
    <section className="thread" aria-label={`Conversation avec ${conversation.other.label}`}>
      <Link to="/messages" className="thread-back"><ArrowLeft size={18} aria-hidden /> Conversations</Link>
      <header className="thread-head">
        <Thumb url={listing.photoUrl} size={64} />
        <div className="thread-listing">
          <p className="muted small">{roleLabel[conversation.other.role]} · {conversation.other.label}</p>
          {listing.status === 'available' ? (
            <Link to={`/annonces/${listing.id}`}><strong>{listing.title}</strong></Link>
          ) : (
            <strong>{listing.title}</strong>
          )}
          <p className="small">
            <b>{formatPrice(listing.priceCents)}</b>
            {listing.status === 'sold' && <span className="badge badge-sold">Vendue</span>}
            {listing.status === 'deleted' && <span className="badge badge-sold">Annonce supprimée</span>}
          </p>
        </div>
      </header>

      <div className="thread-messages" ref={scrollRef} role="log" aria-live="polite" aria-label="Messages">
        <p className="thread-safety"><ShieldCheck size={16} aria-hidden /> Restez sur Occaz : ne communiquez jamais de code ni de coordonnées bancaires.</p>
        {conversation.messages.map((m) => (
          <div key={m.id} className={`bubble-row ${m.mine ? 'mine' : ''}`}>
            <p className="bubble">{m.body}</p>
            <time className="bubble-time" dateTime={m.createdAt} title={fullDate.format(new Date(m.createdAt))}>
              {shortDate(m.createdAt)}
              {status?.id === m.id && (status.seen ? ' · Vu' : ' · Envoyé')}
            </time>
          </div>
        ))}
      </div>

      <form className="composer" onSubmit={send}>
        {sendError && <Alert type="error">{sendError}</Alert>}
        <label htmlFor="composer-body" className="sr-only">Votre message</label>
        <textarea
          id="composer-body"
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Écrivez votre message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" variant="primary" loading={sending} disabled={!body.trim()} aria-label="Envoyer">
          <Send size={18} aria-hidden />
        </Button>
      </form>
    </section>
  )
}
