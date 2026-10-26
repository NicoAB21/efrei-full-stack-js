import { STATUSES, type Status } from '../constants'

/** Statut toujours écrit en toutes lettres, la couleur ne fait que l'appuyer. */
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{STATUSES[status]}</span>
}
