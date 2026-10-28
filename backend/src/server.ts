import mongoose from 'mongoose'
import { createApp } from './app.js'
import { paymentsConfig } from './config.js'

// .env facultatif : en Docker, les variables viennent de docker-compose.yml
try {
  process.loadEnvFile()
} catch {
  // pas de .env
}

const { PORT = '3000', MONGODB_URI, JWT_SECRET } = process.env

if (!MONGODB_URI || !JWT_SECRET) {
  console.error('MONGODB_URI et JWT_SECRET sont obligatoires (voir .env.example)')
  process.exit(1)
}

try {
  console.log(paymentsConfig() ? 'Paiement Stripe activé (mode test)' : 'Paiement Stripe désactivé (pas de STRIPE_SECRET_KEY)')
} catch (err) {
  console.error((err as Error).message)
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)
createApp().listen(Number(PORT), () => {
  console.log(`API sur http://localhost:${PORT}`)
})
