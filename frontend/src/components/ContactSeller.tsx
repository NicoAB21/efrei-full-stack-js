import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth'
import { errorMessage } from '../listings'
import { MAX_MESSAGE_LENGTH, sendMessage } from '../messages'
import { Alert } from './Alert'
import { Button } from './Button'
import { Field } from './Field'

export function ContactSeller({ listingId }: { listingId: string }) {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  if (!user) {
    return (
      <section className="contact-seller">
        <h2>Contacter le vendeur</h2>
        <p className="muted">Connectez-vous pour poser une question au vendeur.</p>
        <Link to="/login" className="btn btn-secondary">
          Se connecter
        </Link>
      </section>
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
    <section className="contact-seller">
      <h2>Contacter le vendeur</h2>
      {sent && <Alert type="success">Message envoyé. Le vendeur le retrouvera dans ses messages.</Alert>}
      {serverError && <Alert type="error">{serverError}</Alert>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          as="textarea"
          label="Votre message"
          placeholder="Bonjour, l’objet est-il toujours disponible ?"
          hint={`${body.length} / ${MAX_MESSAGE_LENGTH} caractères`}
          maxLength={MAX_MESSAGE_LENGTH}
          value={body}
          error={fieldError}
          onChange={(event) => {
            setBody(event.target.value)
            setFieldError(undefined)
            setSent(false)
          }}
        />
        <Button type="submit" variant="night" loading={sending} style={{ justifySelf: 'start' }}>
          <Send size={18} aria-hidden />
          Envoyer le message
        </Button>
      </form>
    </section>
  )
}
