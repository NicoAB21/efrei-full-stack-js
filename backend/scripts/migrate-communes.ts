// Rattache une fois les annonces existantes à une commune officielle (spec 004).
// Usage : npm run migrate:communes   (lit MONGODB_URI dans .env ou l'environnement ; relançable sans effet de bord)
import mongoose from 'mongoose'
import { migrateCommunes } from '../src/communes/migrate.js'

try {
  process.loadEnvFile()
} catch {
  // pas de .env
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI manquant')
await mongoose.connect(process.env.MONGODB_URI)
const { attached, left } = await migrateCommunes()
console.log(`${attached} annonce(s) rattachée(s), ${left} laissée(s) en texte libre`)
await mongoose.disconnect()
