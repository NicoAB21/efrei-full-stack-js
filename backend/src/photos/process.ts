import sharp from 'sharp'
import { invalidInput } from '../errors.js'

// Vérification sur le CONTENU (le type MIME et l'extension viennent du client et sont falsifiables),
// puis ré-encodage en WebP : orientation appliquée, aucune métadonnée conservée (GPS, appareil, date).

type Format = 'jpeg' | 'png' | 'webp'

const DETAIL_WIDTH = 1600
const CARD_WIDTH = 480
const MAX_PIXELS = 40_000_000 // protège contre les images « bombes » de décompression

/** Format d'après la signature binaire du fichier, ou null (SVG, GIF, PDF, texte…). */
export function detectFormat(buffer: Buffer): Format | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  return null
}

export type ProcessedPhoto = { detail: Buffer; card: Buffer; width: number; height: number }

export async function processPhoto(buffer: Buffer, name = 'photo'): Promise<ProcessedPhoto> {
  if (!detectFormat(buffer)) throw invalidInput(`« ${name} » : format refusé, utilisez JPEG, PNG ou WebP`)
  try {
    const source = () => sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate()
    const { data: detail, info } = await source()
      .resize({ width: DETAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true })
    const card = await source().resize({ width: CARD_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    return { detail, card, width: info.width, height: info.height }
  } catch {
    throw invalidInput(`« ${name} » : image illisible ou trop grande`)
  }
}
