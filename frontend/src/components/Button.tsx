import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  /** Désactive le bouton et l'annonce comme occupé (envoi de formulaire…) */
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, disabled, children, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? 'Chargement…' : children}
    </button>
  )
}
