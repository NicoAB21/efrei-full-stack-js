import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = { type: 'success' | 'error'; children: ReactNode }

/** Message de succès (annoncé poliment) ou d'erreur (annoncé immédiatement). */
export function Alert({ type, children }: Props) {
  const Icon = type === 'error' ? CircleAlert : CircleCheck
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  )
}
