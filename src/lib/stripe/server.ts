import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

console.log('[Stripe Server Init] Variables de entorno:', {
  keyExists: !!secretKey,
  keyType: typeof secretKey,
  keyStartsWith: secretKey ? secretKey.substring(0, 10) : 'UNDEFINED',
  envKeys: Object.keys(process.env).filter(k => k.includes('STRIPE'))
})

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY no está configurada')
}

if (secretKey.startsWith('STRIPE_')) {
  throw new Error('STRIPE_SECRET_KEY contiene el nombre de la variable en lugar del valor real. Verifica .env.local')
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

console.log('[Stripe Server] Cliente inicializado correctamente')
