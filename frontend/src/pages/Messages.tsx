import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
import { errorMessage } from '../listings'
import { groupByListing, type Conversation } from '../conversations'
import { fetchReceivedMessages } from '../messages'

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

export function Messages() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchReceivedMessages()
      .then((items) => {
        if (active) setConversations(groupByListing(items))
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause))
      })
    return () => {
      active = false
    }
  }, [])

  const total = conversations?.reduce((sum, c) => sum + c.messages.length, 0) ?? 0
  const listingCount = conversations?.length ?? 0

  return (
    <div className="stack" style={{ maxWidth: 720, marginInline: 'auto', gap: 'var(--s-5)' }}>
      <div className="stack" style={{ gap: 'var(--s-1)' }}>
        <h1>Messages reçus</h1>
        {total > 0 && (
          <p className="muted">
            {total} message{total > 1 ? 's' : ''} sur {listingCount} annonce{listingCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error ? (
        <Alert type="error">{error}</Alert>
      ) : conversations === null ? (
        <p className="muted" role="status">
          Chargement de vos messages…
        </p>
      ) : conversations.length === 0 ? (
        <EmptyState
          title="Aucun message pour l’instant"
          action={
            <Link to="/listings" className="btn btn-primary">
              Voir mes annonces
            </Link>
          }
        >
          Les questions des acheteurs sur vos annonces apparaîtront ici.
        </EmptyState>
      ) : (
        conversations.map((conversation) => (
          <section key={conversation.listingId} className="panel" aria-labelledby={`conv-${conversation.listingId}`}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id={`conv-${conversation.listingId}`} style={{ fontSize: 'var(--fs-h3)' }}>
                {conversation.listingTitle ? (
                  <Link to={`/listings/${conversation.listingId}`}>{conversation.listingTitle}</Link>
                ) : (
                  <span className="muted">Annonce supprimée</span>
                )}
              </h2>
              <span className="message-count">
                <MessageCircle size={14} aria-hidden />
                {conversation.messages.length} message{conversation.messages.length > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="message-list">
              {conversation.messages.map((message) => (
                <li key={message.id}>
                  <time className="muted small" dateTime={message.createdAt}>
                    {date.format(new Date(message.createdAt))}
                  </time>
                  <p>{message.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
