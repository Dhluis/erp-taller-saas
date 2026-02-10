import Stripe from 'stripe'

let secretKey = process.env.STRIPE_SECRET_KEY

// Fix: Si el valor contiene el nombre de la variable (e.g. "STRIPE_SECRET_KEY=sk_live_..."),
// extraer solo el valor real después del "="
if (secretKey && secretKey.startsWith('STRIPE_SECRET_KEY=')) {
  console.warn('[Stripe Server] STRIPE_SECRET_KEY contenía el nombre de la variable como prefijo. Corrigiendo automáticamente.')
  secretKey = secretKey.replace('STRIPE_SECRET_KEY=', '')
}

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY no está configurada en las variables de entorno')
}

if (!secretKey.startsWith('sk_')) {
  console.error('[Stripe Server] STRIPE_SECRET_KEY no parece válida. Debe empezar con sk_live_ o sk_test_. Valor recibido empieza con:', secretKey.substring(0, 10))
  throw new Error('STRIPE_SECRET_KEY no tiene el formato correcto. Debe empezar con sk_live_ o sk_test_')
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})
