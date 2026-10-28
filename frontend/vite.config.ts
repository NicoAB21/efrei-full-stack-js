import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Le front appelle /api/... et /uploads/... (photos) en relatif ; Vite relaie vers l'API (pas de CORS).
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:3000'
const proxy = { '/api': target, '/uploads': target }

export default defineConfig({
  plugins: [react()],
  server: { host: true, proxy },
  preview: { host: true, proxy },
})
