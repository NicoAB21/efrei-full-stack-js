import { readFileSync } from 'node:fs'

// Référentiel officiel des communes (API Géo de l'État), chargé une fois en mémoire.
// Sert les suggestions du formulaire et la validation des annonces, sans réseau (spec 004).

export type Commune = { code: string; name: string; department: string; postalCodes: string[]; population: number; key: string }
export type CommuneSuggestion = { cityCode: string; name: string; postalCode: string; department: string; label: string }

type Raw = { communes: [string, string, string, string[], number][] }

/** « Saint-Étienne », « saint etienne », « SAINT ETIENNE » → « saint etienne ». */
export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-'’\s]+/g, ' ')
    .trim()
}

const raw = JSON.parse(readFileSync(new URL('../../data/communes.json', import.meta.url), 'utf8')) as Raw
const communes: Commune[] = raw.communes.map(([code, name, department, postalCodes, population]) => ({ code, name, department, postalCodes, population, key: normalize(name) }))

const byCode = new Map(communes.map((c) => [c.code, c]))
const byName = new Map<string, Commune[]>()
for (const commune of communes) {
  const key = commune.key
  byName.set(key, [...(byName.get(key) ?? []), commune])
}
// Liste triée des noms normalisés, pour une recherche par préfixe
const names = [...byName.keys()].sort()

export const findCommune = (code: string) => byCode.get(code) ?? null

/** La commune si le code postal lui appartient, sinon null. */
export function checkLocation(cityCode: string, postalCode: string) {
  const commune = findCommune(cityCode)
  return commune && commune.postalCodes.includes(postalCode) ? commune : null
}

export const communesByName = (name: string) => byName.get(normalize(name)) ?? []

const MAX_SUGGESTIONS = 20

/** Suggestions par début de nom (casse, accents, tirets ignorés) ou début de code postal. */
export function searchCommunes(query: string): CommuneSuggestion[] {
  const q = normalize(query)
  const pairs: { commune: Commune; postalCode: string }[] = []

  if (/^\d{2,5}$/.test(q)) {
    for (const commune of communes) {
      for (const postalCode of commune.postalCodes) if (postalCode.startsWith(q)) pairs.push({ commune, postalCode })
    }
  } else {
    // Les noms sont triés : on part du premier qui commence par q
    let low = 0
    let high = names.length
    while (low < high) {
      const mid = (low + high) >> 1
      if (names[mid] < q) low = mid + 1
      else high = mid
    }
    for (let i = low; i < names.length && names[i].startsWith(q); i++) {
      for (const commune of byName.get(names[i])!) for (const postalCode of commune.postalCodes) pairs.push({ commune, postalCode })
    }
  }

  return pairs
    .sort(
      (a, b) =>
        // Nom exact d'abord, puis la plus peuplée (« mar » → Marseille), puis alphabétique et code postal
        Number(b.commune.key === q) - Number(a.commune.key === q) ||
        b.commune.population - a.commune.population ||
        a.commune.name.localeCompare(b.commune.name, 'fr') ||
        a.postalCode.localeCompare(b.postalCode),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ commune, postalCode }) => ({
      cityCode: commune.code,
      name: commune.name,
      postalCode,
      department: commune.department,
      label: `${commune.name} (${postalCode})`,
    }))
}
