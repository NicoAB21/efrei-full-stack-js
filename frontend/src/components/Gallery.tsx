import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import type { Category, Photo } from '../constants'
import { CategoryIcon } from './CategoryIcon'

type Props = { photos: Photo[]; title: string; category: Category }

/** Photos d'une annonce : grande photo, flèches, compteur et vignettes ; pictogramme de la catégorie si aucune photo. */
export function Gallery({ photos, title, category }: Props) {
  const [index, setIndex] = useState(0)
  if (photos.length === 0) {
    return (
      <div className="gallery-main gallery-empty" role="img" aria-label={`${title} : pas de photo`}>
        <CategoryIcon category={category} size={96} strokeWidth={1.25} />
      </div>
    )
  }
  const current = photos[Math.min(index, photos.length - 1)]
  const label = (i: number) => `${title}, photo ${i + 1} sur ${photos.length}`
  const go = (step: number) => setIndex((index + step + photos.length) % photos.length)

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
        {photos.length > 1 && (
          <>
            <button type="button" className="gallery-nav prev" aria-label="Photo précédente" onClick={() => go(-1)}>
              <ChevronLeft size={22} aria-hidden />
            </button>
            <button type="button" className="gallery-nav next" aria-label="Photo suivante" onClick={() => go(1)}>
              <ChevronRight size={22} aria-hidden />
            </button>
            <span className="gallery-count" aria-hidden>
              {index + 1} / {photos.length}
            </span>
          </>
        )}
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
