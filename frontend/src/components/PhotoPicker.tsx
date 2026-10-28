import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ACCEPTED_TYPES, checkPhoto, MAX_PHOTOS } from '../photos'

// Sélection de photos AVANT publication (aperçus locaux) ; règles dans ../photos.ts.

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  /** Photos déjà en ligne (page de modification) : comptent dans la limite de 5 */
  existingCount?: number
}

export function PhotoPicker({ files, onChange, existingCount = 0 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [error, setError] = useState('')
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  function add(selected: FileList | null) {
    const next = [...files]
    for (const file of Array.from(selected ?? [])) {
      const problem = checkPhoto(file, existingCount + next.length)
      if (problem) {
        setError(problem)
        break
      }
      next.push(file)
    }
    if (next.length === files.length + (selected?.length ?? 0)) setError('')
    onChange(next)
    if (inputRef.current) inputRef.current.value = '' // permet de re-choisir le même fichier
  }

  const remaining = MAX_PHOTOS - existingCount - files.length
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 'var(--s-2)' }}>
      <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Photos ({MAX_PHOTOS} maximum)</legend>
      {files.length > 0 && (
        <div className="photo-grid">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="photo-tile">
              <figure>
                <img src={previews[i]} alt={`Aperçu : ${file.name}`} />
                {existingCount === 0 && i === 0 && <figcaption>Principale</figcaption>}
              </figure>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <X size={16} aria-hidden /> Retirer <span className="sr-only">{file.name}</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        hidden
        aria-describedby={hintId}
        onChange={(e) => add(e.target.files)}
      />
      <div className="row">
        <button type="button" className="btn btn-secondary btn-sm" disabled={remaining <= 0} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={18} aria-hidden /> Ajouter des photos
        </button>
        <span id={hintId} className="field-hint">JPEG, PNG ou WebP, 5 Mo maximum. La première est la photo principale.</span>
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </fieldset>
  )
}
