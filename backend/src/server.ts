import mongoose from 'mongoose'
import { createApp } from './app.js'

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

await mongoose.connect(MONGODB_URI)
createApp().listen(Number(PORT), () => {
  console.log(`API sur http://localhost:${PORT}`)
})
