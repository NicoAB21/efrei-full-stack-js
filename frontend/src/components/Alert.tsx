import type { ReactNode } from 'react'

type Props = { type: 'success' | 'error'; children: ReactNode }

/** Message de succès (annoncé poliment) ou d'erreur (annoncé immédiatement). */
export function Alert({ type, children }: Props) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
