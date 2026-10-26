const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** 12345 → "123,45 €" */
export const formatPrice = (cents: number) => euros.format(cents / 100)

/**
 * Saisie en euros → centimes entiers, ou null si invalide.
 * Accepte "85", "85,5", "85.50", "1 200,00". Calcul sur les chiffres, sans flottant.
 */
export function parsePrice(input: string): number | null {
  const match = input.replace(/\s/g, '').match(/^(\d+)(?:[.,](\d{1,2}))?$/)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return cents >= 1 && Number.isSafeInteger(cents) ? cents : null
}
