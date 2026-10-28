import { useState, type KeyboardEvent } from 'react'
import type { Photo } from '../constants'

/** Photos d'une annonce : grande photo + vignettes ; flèches gauche/droite au clavier. Rien si aucune photo. */
export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [index, setIndex] = useState(0)
  if (photos.length === 0) return null
  const current = photos[Math.min(index, photos.length - 1)]
  const label = (i: number) => `${title}, photo ${i + 1} sur ${photos.length}`

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = (index + (event.key === 'ArrowRight' ? 1 : photos.length - 1)) % photos.length
    setIndex(next)
    // Le focus suit la vignette active
    ;(event.currentTarget.querySelectorAll('button')[next] as HTMLButtonElement | undefined)?.focus()
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={current.url} alt={label(index)} width={current.width} height={current.height} />
      </div>
      {photos.length > 1 && (
        <div className="gallery-thumbs" role="group" aria-label="Choisir une photo" onKeyDown={onKeyDown}>
          {photos.map((photo, i) => (
            <button key={photo.id} type="button" aria-label={`Voir la photo ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)}>
              <img src={photo.cardUrl} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
