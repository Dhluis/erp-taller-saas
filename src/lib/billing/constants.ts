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
  MX: {
    monthly: {
      amount: 2924,
      currency: 'MXN',
      displayPrice: '$2,924 MXN',
      stripePriceId: 'price_MX_MONTHLY',
      mercadopagoTitle: 'Plan Mensual Premium - Eagles System',
    },
    annual: {
      amount: 24091,
      currency: 'MXN',
      displayPrice: '$24,091 MXN',
      stripePriceId: 'price_MX_ANNUAL',
      mercadopagoTitle: 'Plan Anual Premium - Eagles System',
      savings: { amount: 10997, percentage: 31 },
    },
  },
  AR: {
    monthly: {
      amount: 246882,
      currency: 'ARS',
      displayPrice: '$246,882 ARS',
      mercadopagoTitle: 'Plan Mensual Premium - Eagles System',
    },
    annual: {
      amount: 2033000,
      currency: 'ARS',
      displayPrice: '$2,033,000 ARS',
      mercadopagoTitle: 'Plan Anual Premium - Eagles System',
      savings: { amount: 929384, percentage: 31 },
    },
  },
  BR: {
    monthly: {
      amount: 986,
      currency: 'BRL',
      displayPrice: 'R$986 BRL',
      mercadopagoTitle: 'Plano Mensal Premium - Eagles System',
    },
    annual: {
      amount: 8120,
      currency: 'BRL',
      displayPrice: 'R$8,120 BRL',
      mercadopagoTitle: 'Plano Anual Premium - Eagles System',
      savings: { amount: 3712, percentage: 31 },
    },
  },
  CL: {
    monthly: {
      amount: 145025,
      currency: 'CLP',
      displayPrice: '$145,025 CLP',
      mercadopagoTitle: 'Plan Mensual Premium - Eagles System',
    },
    annual: {
      amount: 1194600,
      currency: 'CLP',
      displayPrice: '$1,194,600 CLP',
      mercadopagoTitle: 'Plan Anual Premium - Eagles System',
      savings: { amount: 545700, percentage: 31 },
    },
  },
  CO: {
    monthly: {
      amount: 625422,
      currency: 'COP',
      displayPrice: '$625,422 COP',
      mercadopagoTitle: 'Plan Mensual Premium - Eagles System',
    },
    annual: {
      amount: 5150000,
      currency: 'COP',
      displayPrice: '$5,150,000 COP',
      mercadopagoTitle: 'Plan Anual Premium - Eagles System',
      savings: { amount: 2355064, percentage: 31 },
    },
  },
  PE: {
    monthly: {
      amount: 629,
      currency: 'PEN',
      displayPrice: 'S/629 PEN',
      mercadopagoTitle: 'Plan Mensual Premium - Eagles System',
    },
    annual: {
      amount: 5180,
      currency: 'PEN',
      displayPrice: 'S/5,180 PEN',
      mercadopagoTitle: 'Plan Anual Premium - Eagles System',
      savings: { amount: 2368, percentage: 31 },
    },
  },
  UY: {
    monthly: {
      amount: 7140,
      currency: 'UYU',
      displayPrice: '$7,140 UYU',
      mercadopagoTitle: 'Plan Mensual Premium - Eagles System',
    },
    annual: {
      amount: 58800,
      currency: 'UYU',
      displayPrice: '$58,800 UYU',
      mercadopagoTitle: 'Plan Anual Premium - Eagles System',
      savings: { amount: 26880, percentage: 31 },
    },
  },
  US: {
    monthly: {
      amount: PRICING.monthly.amount,
      currency: 'USD',
      displayPrice: PRICING.monthly.displayPrice,
      stripePriceId: PRICING.monthly.stripePriceId,
      mercadopagoTitle: 'Premium Monthly - Eagles System',
    },
    annual: {
      amount: PRICING.annual.amount,
      currency: 'USD',
      displayPrice: PRICING.annual.displayPrice,
      stripePriceId: PRICING.annual.stripePriceId,
      mercadopagoTitle: 'Premium Annual - Eagles System',
      monthlyEquivalent: PRICING.annual.monthlyEquivalent,
      savings: {
        amount: PRICING.annual.savings.amount,
        percentage: PRICING.annual.savings.percentage,
        monthsFree: PRICING.annual.savings.monthsFree,
      },
    },
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

export function shouldUseMercadoPago(country: CountryCode): boolean {
  return ['MX', 'AR', 'BR', 'CL', 'CO', 'PE', 'UY'].includes(country)
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
