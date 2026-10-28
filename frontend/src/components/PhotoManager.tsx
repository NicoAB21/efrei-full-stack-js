import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Listing } from '../constants'
import { deletePhoto, errorMessage, reorderPhotos, uploadPhotos } from '../listings'
import { Alert } from './Alert'
import { ACCEPTED_TYPES, checkPhoto, MAX_PHOTOS } from '../photos'

// Page de modification : chaque action est enregistrée tout de suite (ajout, ordre, principale, suppression).

export function PhotoManager({ listing, onChange }: { listing: Listing; onChange: (listing: Listing) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const photos = listing.photos

  async function run(action: () => Promise<Listing>, done: string) {
    setBusy(true)
    setError('')
    try {
      onChange(await action())
      setStatus(done)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function move(from: number, to: number) {
    const order = photos.map((p) => p.id)
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    return run(() => reorderPhotos(listing.id, order), to === 0 ? 'Photo principale modifiée.' : 'Ordre des photos enregistré.')
  }

  function add(selected: FileList | null) {
    const files = Array.from(selected ?? [])
    if (inputRef.current) inputRef.current.value = ''
    for (const [i, file] of files.entries()) {
      const problem = checkPhoto(file, photos.length + i)
      if (problem) return setError(problem)
    }
    if (files.length > 0) run(() => uploadPhotos(listing.id, files), `${files.length} photo${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''}.`)
  }

  return (
    <section className="panel" aria-labelledby="photos-title">
      <h2 id="photos-title" style={{ fontSize: 'var(--fs-h3)' }}>Photos ({photos.length}/{MAX_PHOTOS})</h2>
      {error && <Alert type="error">{error}</Alert>}
      <p className="sr-only" role="status">{status}</p>
      {photos.length === 0 ? (
        <p className="muted">Aucune photo : la carte affiche le pictogramme de la catégorie.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo, i) => (
            <div key={photo.id} className="photo-tile">
              <figure>
                <img src={photo.cardUrl} alt={`${listing.title}, photo ${i + 1} sur ${photos.length}`} />
                {i === 0 && <figcaption>Principale</figcaption>}
              </figure>
              <div className="row">
                <button type="button" className="icon-btn" disabled={busy || i === 0} aria-label={`Déplacer la photo ${i + 1} vers la gauche`} onClick={() => move(i, i - 1)}>
                  <ArrowLeft size={18} aria-hidden />
                </button>
                <button type="button" className="icon-btn" disabled={busy || i === photos.length - 1} aria-label={`Déplacer la photo ${i + 1} vers la droite`} onClick={() => move(i, i + 1)}>
                  <ArrowRight size={18} aria-hidden />
                </button>
                <button type="button" className="icon-btn" disabled={busy || i === 0} aria-label={`Faire de la photo ${i + 1} la photo principale`} onClick={() => move(i, 0)}>
                  <Star size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={busy}
                  aria-label={`Supprimer la photo ${i + 1}`}
                  onClick={() => window.confirm('Supprimer cette photo ?') && run(() => deletePhoto(listing.id, photo.id), 'Photo supprimée.')}
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} multiple hidden onChange={(e) => add(e.target.files)} />
      <div className="row">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={18} aria-hidden /> {busy ? 'Envoi…' : 'Ajouter des photos'}
        </button>
        <span className="field-hint">JPEG, PNG ou WebP, 5 Mo maximum.</span>
      </div>
    </section>
  )
}
