import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ProcessedPhoto } from './process.js'

// Photos sur disque, sous un nom aléatoire (non devinable). En dev : backend/uploads (ignoré par git).

export function uploadsDir() {
  const dir = path.resolve(process.env.UPLOADS_DIR ?? 'uploads')
  mkdirSync(dir, { recursive: true })
  return dir
}

const fileName = (id: string, size: 1600 | 480) => `${id}-${size}.webp`

export type StoredPhoto = { id: string; url: string; cardUrl: string; width: number; height: number }

export async function savePhoto(photo: ProcessedPhoto): Promise<StoredPhoto> {
  const id = randomUUID()
  const dir = uploadsDir()
  await writeFile(path.join(dir, fileName(id, 1600)), photo.detail)
  await writeFile(path.join(dir, fileName(id, 480)), photo.card)
  return { id, url: `/uploads/${fileName(id, 1600)}`, cardUrl: `/uploads/${fileName(id, 480)}`, width: photo.width, height: photo.height }
}

/** Supprime les 2 fichiers d'une photo ; une erreur n'empêche pas l'opération en cours. */
export async function deletePhotoFiles(id: string) {
  const dir = uploadsDir()
  await Promise.all([1600, 480].map((size) => rm(path.join(dir, fileName(id, size as 1600 | 480)), { force: true }))).catch((err) =>
    console.error('Suppression de photo impossible', id, err),
  )
}
