// Règles des photos côté navigateur (confort seulement : la vérification qui compte est côté serveur).

export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Message d'erreur si un fichier ne peut pas être ajouté, sinon null. */
export function checkPhoto(file: File, alreadyCount: number) {
  if (alreadyCount >= MAX_PHOTOS) return `${MAX_PHOTOS} photos maximum par annonce`
  if (!ACCEPTED_TYPES.includes(file.type)) return `« ${file.name} » : format refusé, utilisez JPEG, PNG ou WebP`
  if (file.size > MAX_PHOTO_BYTES) return `« ${file.name} » : 5 Mo maximum`
  return null
}
