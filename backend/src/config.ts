// Paiement de démonstration (spec 005) : clés Stripe de TEST uniquement, lues dans l'environnement.
export type PaymentsConfig = { secretKey: string; webhookSecret: string; frontUrl: string }

/** null = paiement désactivé (pas de clé) ; lève si la configuration est dangereuse ou incomplète. */
export function paymentsConfig(): PaymentsConfig | null {
  const { STRIPE_SECRET_KEY: secretKey, STRIPE_WEBHOOK_SECRET: webhookSecret, FRONT_URL: frontUrl } = process.env
  if (!secretKey) return null
  if (!secretKey.startsWith('sk_test_')) throw new Error('STRIPE_SECRET_KEY doit être une clé de TEST (sk_test_…) : paiement de démonstration uniquement')
  if (!webhookSecret?.startsWith('whsec_')) throw new Error('STRIPE_WEBHOOK_SECRET (whsec_…) est obligatoire : voir `stripe listen` dans le README')
  if (!frontUrl) throw new Error('FRONT_URL est obligatoire pour le retour de paiement')
  return { secretKey, webhookSecret, frontUrl: frontUrl.replace(/\/$/, '') }
}
