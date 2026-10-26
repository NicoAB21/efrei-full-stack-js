import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="btn btn-ghost btn-sm" style={{ justifySelf: 'start', paddingInline: 'var(--s-2)' }}>
      <ArrowLeft size={18} aria-hidden />
      {children}
    </Link>
  )
}
