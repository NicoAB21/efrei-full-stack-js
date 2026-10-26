import { Tag } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  children?: ReactNode
  /** Bouton ou lien d'action, ex. <Link className="btn btn-primary"> */
  action?: ReactNode
}

/** Liste vide : jamais une page blanche, toujours une prochaine étape. */
export function EmptyState({ title, children, action }: Props) {
  return (
    <div className="empty-state">
      <Tag size={40} strokeWidth={1.75} aria-hidden />
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}
