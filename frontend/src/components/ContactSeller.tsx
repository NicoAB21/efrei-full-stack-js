import { MessageCircle, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../listings'
import { MAX_MESSAGE_LENGTH, sendFirstMessage } from '../messages'
import { useUnread } from '../unread'
import { Alert } from './Alert'
import { Button } from './Button'
import { Field } from './Field'

// Premiers messages proposés, comme sur les grands sites entre particuliers
const QUICK_REPLIES = ['Bonjour, est-il toujours disponible ?', 'Le prix est-il négociable ?', 'Je suis intéressé(e), quand puis-je passer ?']

type Props = {
  listingId: string
  primary: boolean
  connected: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactSeller({ listingId, primary, connected, open, onOpenChange }: Props) {
  const panelId = useId()
  const className = `btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-block`
  const [body, setBody] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [serverError, setServerError] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { refresh } = useUnread()
  const [sending, setSending] = useState(false)

  if (!connected) {
    return (
      <Link to="/login" className={className}>
        <MessageCircle size={18} aria-hidden />
        Se connecter pour contacter le vendeur
      </Link>
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError('')
    setConversationId(null)
    if (!body.trim()) {
      setFieldError('Écrivez votre message avant de l’envoyer.')
      return
    }
    setFieldError(undefined)
    setSending(true)
    try {
      const result = await sendFirstMessage(listingId, body.trim())
      setBody('')
      setConversationId(result.conversationId)
      refresh()
    } catch (cause) {
      setServerError(errorMessage(cause))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        id={`contact-${listingId}`}
        className={className}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        <MessageCircle size={18} aria-hidden />
        Contacter le vendeur
      </button>
      {open && (
        <div id={panelId} className="contact-panel" role="region" aria-label="Contacter le vendeur">
          {conversationId && (
            <Alert type="success">
              Message envoyé. <Link to={`/messages/${conversationId}`}>Voir la conversation</Link>
            </Alert>
          )}
          {serverError && <Alert type="error">{serverError}</Alert>}
          <form className="stack" onSubmit={submit} noValidate>
            <div className="chips" aria-label="Messages rapides">
              {QUICK_REPLIES.map((text) => (
                <button key={text} type="button" className="chip chip-sm" onClick={() => { setBody(text); setFieldError(undefined) }}>
                  {text}
                </button>
              ))}
            </div>
            <Field
              as="textarea"
              label="Votre message"
              placeholder="Bonjour, l’objet est-il toujours disponible ?"
              hint={`${body.length} / ${MAX_MESSAGE_LENGTH} caractères · votre email n’est pas transmis`}
              maxLength={MAX_MESSAGE_LENGTH}
              value={body}
              error={fieldError}
              onChange={(event) => {
                setBody(event.target.value)
                setFieldError(undefined)
                setConversationId(null)
              }}
            />
            <Button type="submit" variant="night" className="btn-block" loading={sending}>
              <Send size={18} aria-hidden />
              Envoyer le message
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
