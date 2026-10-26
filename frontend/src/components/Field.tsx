import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type Common = {
  label: string
  /** Message d'erreur affiché sous le champ et lu par les lecteurs d'écran */
  error?: string
  hint?: string
}

type Props =
  | (Common & { as?: 'input' } & InputHTMLAttributes<HTMLInputElement>)
  | (Common & { as: 'textarea' } & TextareaHTMLAttributes<HTMLTextAreaElement>)
  | (Common & { as: 'select'; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>)

/** Label + champ + aide + erreur, reliés entre eux pour l'accessibilité. */
export function Field(props: Props) {
  const { label, error, hint, as = 'input', id: givenId, ...control } = props
  const autoId = useId()
  const id = givenId ?? autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  const a11y = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {as === 'textarea' ? (
        <textarea {...(control as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...a11y} />
      ) : as === 'select' ? (
        <select {...(control as SelectHTMLAttributes<HTMLSelectElement>)} {...a11y} />
      ) : (
        <input {...(control as InputHTMLAttributes<HTMLInputElement>)} {...a11y} />
      )}
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}
