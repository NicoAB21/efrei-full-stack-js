import { MapPin } from 'lucide-react'
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { apiFetch } from '../api'

// Champ « commune » avec suggestions officielles (motif WAI-ARIA combobox, spec 004).
// Choisir une suggestion fixe { cityCode, postalCode } ; retaper le texte efface ce choix.

export type CommuneChoice = { cityCode: string; postalCode: string; name: string; label: string }
type Suggestion = CommuneChoice & { department: string }

type Props = {
  label: string
  value: CommuneChoice | null
  onChange: (choice: CommuneChoice | null) => void
  /** Texte affiché au départ (annonce existante) */
  initialText?: string
  error?: string
  hint?: string
  placeholder?: string
  /** Texte tapé sans choisir de suggestion (utile pour la recherche de la vitrine) */
  onTextChange?: (text: string) => void
  name?: string
}

export function CommuneField({ label, value, onChange, initialText = '', error, hint, placeholder = 'Ex. Lyon ou 69003', onTextChange, name }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [text, setText] = useState(value?.label ?? initialText)
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState('')

  // Suggestions 250 ms après la dernière frappe, dès 2 caractères (seulement si l'utilisateur tape)
  useEffect(() => {
    if (!open) return
    const q = text.trim()
    let cancelled = false
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setItems([])
        setStatus('Tapez au moins 2 caractères')
        return
      }
      apiFetch<{ items: Suggestion[] }>(`/communes?q=${encodeURIComponent(q)}`)
        .then(({ items }) => {
          if (cancelled) return
          setItems(items)
          setActive(-1)
          setStatus(items.length === 0 ? 'Aucune commune ne correspond' : `${items.length} suggestion${items.length > 1 ? 's' : ''}`)
        })
        .catch(() => !cancelled && setStatus('Suggestions indisponibles, réessayez'))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text, open])

  function choose(item: Suggestion) {
    const choice = { cityCode: item.cityCode, postalCode: item.postalCode, name: item.name, label: item.label }
    setText(item.label)
    setOpen(false)
    setItems([])
    onChange(choice)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (items.length === 0) return
      event.preventDefault()
      setOpen(true)
      setActive((i) => (event.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length))
    } else if (event.key === 'Enter' && open && active >= 0) {
      event.preventDefault() // Entrée choisit la suggestion au lieu d'envoyer le formulaire
      choose(items[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const showList = open && items.length > 0

  return (
    <div className="field combobox">
      <label htmlFor={id}>{label}</label>
      <div className="combobox-input">
        <MapPin size={18} aria-hidden />
        <input
          id={id}
          name={name}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          maxLength={80}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            onTextChange?.(e.target.value)
            if (value) onChange(null) // le texte ne correspond plus au choix
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      <ul id={listId} role="listbox" className="combobox-list" hidden={!showList} aria-label={`Suggestions pour ${label}`}>
        {items.map((item, i) => (
          <li
            key={`${item.cityCode}-${item.postalCode}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className="combobox-option"
            onMouseDown={(e) => e.preventDefault()} // garde le focus dans le champ
            onClick={() => choose(item)}
          >
            {item.label} <span className="muted small">· {item.department}</span>
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status" aria-live="polite">{open ? status : ''}</span>
      {hint && <span id={`${id}-hint`} className="field-hint">{hint}</span>}
      {error && <span id={`${id}-error`} className="field-error">{error}</span>}
    </div>
  )
}
