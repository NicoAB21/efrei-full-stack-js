// Télécharge le référentiel officiel des communes (API Géo de l'État) et l'écrit en JSON compact.
// Usage : npm run data:communes   (à relancer une fois par an ; le fichier est versionné)
import { writeFileSync } from 'node:fs'

const SOURCE = 'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,codeDepartement,population&format=json'

type ApiCommune = { nom: string; code: string; codeDepartement: string; codesPostaux: string[]; population?: number }

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`API Géo : HTTP ${res.status}`)
const all = (await res.json()) as ApiCommune[]
const communes = all
  .filter((c) => c.codesPostaux.length > 0) // quelques communes n'ont pas de code postal
  .map((c) => [c.code, c.nom, c.codeDepartement, [...c.codesPostaux].sort(), c.population ?? 0])
  .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

const file = new URL('../data/communes.json', import.meta.url)
writeFileSync(file, JSON.stringify({ source: 'geo.api.gouv.fr/communes', fetchedAt: new Date().toISOString().slice(0, 10), communes }))
console.log(`${communes.length} communes écrites (${all.length - communes.length} sans code postal écartées)`)
