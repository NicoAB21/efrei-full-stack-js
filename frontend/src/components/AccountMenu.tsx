import { LogOut, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'

type Props = {
  email: string
  onLogout: () => void
}

export function AccountMenu({ email, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function closeWhenFocusLeaves(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }

  return (
    <div className="account-menu" ref={rootRef} onBlur={closeWhenFocusLeaves}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-label="Mon compte"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <UserRound size={22} strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="account-panel">
          <div className="account-identity">
            <span className="account-avatar" aria-hidden>
              {email.charAt(0).toUpperCase()}
            </span>
            <div>
              <span className="account-label">Connecté en tant que</span>
              <strong title={email}>{email}</strong>
            </div>
          </div>
          <button type="button" className="account-action" onClick={onLogout}>
            <LogOut size={18} aria-hidden />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
