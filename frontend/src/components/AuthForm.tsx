import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import { Alert } from './Alert'
import { Button } from './Button'
import { Field } from './Field'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const registering = mode === 'register'
  if (auth.user) return <Navigate to="/listings" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      await auth[mode]({ email: email.trim(), password })
      navigate('/listings', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="stack" style={{ maxWidth: '28rem', marginInline: 'auto' }}>
      <h1>{registering ? 'Créer un compte' : 'Se connecter'}</h1>
      <p className="muted">
        {registering
          ? 'Créez votre compte pour publier vos annonces.'
          : 'Retrouvez vos annonces et gérez vos ventes.'}
      </p>
      {!registering && params.get('expired') === '1' && (
        <Alert type="error">Session expirée, reconnectez-vous</Alert>
      )}
      {error && <Alert type="error">{error}</Alert>}
      <form className="stack" onSubmit={submit} aria-busy={loading}>
        <Field
          label="Adresse email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
        />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          required
          minLength={8}
          hint="Au moins 8 caractères."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
        />
        <Button type="submit" loading={loading}>
          {registering ? 'Créer mon compte' : 'Se connecter'}
        </Button>
      </form>
      <p>
        {registering ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
        <Link to={registering ? '/login' : '/register'}>
          {registering ? 'Se connecter' : 'Créer un compte'}
        </Link>
      </p>
    </section>
  )
}
