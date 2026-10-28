import { MessageCircle, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../listings'
import { MAX_MESSAGE_LENGTH, sendMessage } from '../messages'
import { Alert } from './Alert'
import { Button } from './Button'
import { Field } from './Field'

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
  const [sent, setSent] = useState(false)
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
    setSent(false)
    if (!body.trim()) {
      setFieldError('Écrivez votre message avant de l’envoyer.')
      return
    }
    setFieldError(undefined)
    setSending(true)
    try {
      await sendMessage(listingId, body.trim())
      setBody('')
      setSent(true)
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
          {sent && <Alert type="success">Message envoyé. Le vendeur le retrouvera dans ses messages.</Alert>}
          {serverError && <Alert type="error">{serverError}</Alert>}
          <form className="stack" onSubmit={submit} noValidate>
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
                setSent(false)
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
