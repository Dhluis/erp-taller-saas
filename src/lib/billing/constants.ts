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

export const PRICING_BY_COUNTRY = {
  MX: { currency: 'MXN', symbol: '$' },
  AR: { currency: 'ARS', symbol: '$' },
  BR: { currency: 'BRL', symbol: 'R$' },
  CL: { currency: 'CLP', symbol: '$' },
  CO: { currency: 'COP', symbol: '$' },
  PE: { currency: 'PEN', symbol: 'S/' },
  UY: { currency: 'UYU', symbol: '$' },
  US: { 
    currency: 'USD', 
    symbol: '$',
    monthly: { stripePriceId: PRICING.monthly.stripePriceId },
    annual: { stripePriceId: PRICING.annual.stripePriceId }
  },
} as const

export type CountryCode = keyof typeof PRICING_BY_COUNTRY

export function detectUserCountry(): CountryCode {
  if (typeof window === 'undefined') return 'US'

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (timezone.includes('Mexico')) return 'MX'
  if (timezone.includes('Argentina')) return 'AR'
  if (timezone.includes('Sao_Paulo')) return 'BR'
  if (timezone.includes('Santiago')) return 'CL'
  if (timezone.includes('Bogota')) return 'CO'
  if (timezone.includes('Lima')) return 'PE'
  if (timezone.includes('Montevideo')) return 'UY'

  return 'US'
}

export function getPricingByCountry(country: CountryCode) {
  return PRICING_BY_COUNTRY[country] ?? PRICING_BY_COUNTRY.US
}

export const FEATURES = {
  free: [
    '20 clientes',
    '20 órdenes de trabajo por mes',
    '30 productos en inventario',
    '2 usuarios activos',
    'Soporte por email'
  ],
  premium: [
    '✅ Clientes ilimitados',
    '✅ Órdenes de trabajo ilimitadas',
    '✅ Inventario ilimitado',
    '✅ Usuarios ilimitados',
    '✅ WhatsApp con API oficial',
    '✅ Eagles AI Assistant (Agente)',
    '✅ Magic Create (Intención IA)',
    '✅ Dictado por Voz Inteligente',
    '✅ Eagles AI Insights & BI',
    '✅ Reportes avanzados',
    '✅ Soporte prioritario 24/7',
    '✅ Acceso a API',
    '✅ Marca personalizada'
  ],
  premium_only: [
    'WhatsApp con API oficial',
    'Eagles AI Assistant (Agente)',
    'Magic Create (Intención IA)',
    'Dictado por Voz Inteligente',
    'Eagles AI Insights & BI',
    'Usuarios ilimitados',
    'Reportes avanzados'
  ]
} as const

export const PLAN_NAMES = {
  free: 'Plan Free',
  premium: 'Plan Premium'
} as const
