/**
 * =====================================================
 * BILLING: Constantes de Planes y Precios
 * =====================================================
 */

export const PRICING = {
  monthly: {
    amount: 170,
    currency: 'USD',
    interval: 'month',
    displayPrice: '$170 USD',
    displayInterval: '/mes',
    stripePriceId: 'price_1Syz9uIeJVX0kfvleg8RfZed'
  },
  annual: {
    amount: 1400,
    currency: 'USD',
    interval: 'year',
    displayPrice: '$1,400 USD',
    displayInterval: '/año',
    stripePriceId: 'price_1Syze3IeJVX0kfvlIYg09Q5Z',
    monthlyEquivalent: 116.67, // $1,400 / 12 = $116.67/mes
    savings: {
      amount: 640, // $170 * 12 - $1,400 = $640
      percentage: 31, // ($640 / $2,040) * 100 ≈ 31%
      monthsFree: '¡Equivalente a 3.7 meses gratis!'
    }
  }
} as const

export const FEATURES = {
  free: [
    '50 clientes',
    '20 órdenes de trabajo por mes',
    '100 productos en inventario',
    '2 usuarios activos',
    'Soporte por email'
  ],
  premium: [
    '✅ Clientes ilimitados',
    '✅ Órdenes de trabajo ilimitadas',
    '✅ Inventario ilimitado',
    '✅ Usuarios ilimitados',
    '✅ WhatsApp con API oficial',
    '✅ Reportes avanzados',
    '✅ Soporte prioritario 24/7',
    '✅ Acceso a API',
    '✅ Marca personalizada'
  ]
} as const

export const PLAN_NAMES = {
  free: 'Plan Free',
  premium: 'Plan Premium'
} as const
