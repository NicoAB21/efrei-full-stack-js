import type { ButtonHTMLAttributes } from 'react'

// Pour un lien qui ressemble à un bouton : <Link className="btn btn-primary">, pas de composant dédié.

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'night' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  /** Désactive le bouton et l'annonce comme occupé (envoi de formulaire…) */
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? 'Chargement…' : children}
    </button>
  )
}
