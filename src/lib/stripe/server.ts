import Stripe from 'stripe'

/**
 * Inicialización del cliente Stripe del servidor.
 * Maneja múltiples formatos incorrectos de STRIPE_SECRET_KEY que pueden
 * ocurrir cuando se pega la línea completa del .env en Vercel.
 */
function getStripeSecretKey(): string {
  let key = process.env.STRIPE_SECRET_KEY || ''

  // Fix 1: Si pegaron la línea completa "STRIPE_SECRET_KEY=sk_live_..."
  if (key.includes('STRIPE_SECRET_KEY=')) {
    key = key.split('STRIPE_SECRET_KEY=').pop() || ''
  }

  // Fix 2: Si el valor no tiene el prefijo sk_ pero contiene "_live_" o "_test_"
  if (!key.startsWith('sk_') && key.includes('live_')) {
    key = 'sk_' + key
  }
  if (!key.startsWith('sk_') && key.includes('test_')) {
    key = 'sk_' + key
  }

  // Trim por si hay espacios
  key = key.trim()

  return key
}

const secretKey = getStripeSecretKey()

if (!secretKey) {
  // En build time, no lanzar error - solo advertir
  console.warn('[Stripe Server] STRIPE_SECRET_KEY no está configurada. Las funciones de billing no funcionarán.')
}

// Crear cliente Stripe solo si hay key válida, sino crear un placeholder que fallará en runtime
export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  : (new Proxy({} as Stripe, {
      get(_, prop) {
        throw new Error(`Stripe no está configurado. STRIPE_SECRET_KEY no encontrada. Método llamado: ${String(prop)}`)
      }
    }) as unknown as Stripe)
