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
    stripePriceId: 'price_1TL4xcIeJVX0kfvlQfLCOetp'
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
      monthsFree: '¡Equivalente a más de 3 meses gratis!'
    }
  }
} as const

export const PRICING_BY_COUNTRY = {
  MX: { 
    currency: 'MXN', 
    symbol: '$',
    monthly: { stripePriceId: 'price_1TL4gHIeJVX0kfvlKMEvD1Ry' }
  },
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
  console.log(`[Billing] Detectando país para zona horaria: ${timezone}`)

  // Matriz de ciudades por país (estándar IANA)
  const tzMap: Record<string, CountryCode> = {
    // MÉXICO
    'Mexico_City': 'MX',
    'Monterrey': 'MX',
    'Tijuana': 'MX',
    'Cancun': 'MX',
    'Chihuahua': 'MX',
    'Hermosillo': 'MX',
    'Mazatlan': 'MX',
    'Merida': 'MX',
    'Matamoros': 'MX',
    'Bahia_Banderas': 'MX',
    'Ojinaga': 'MX',
    // COLOMBIA
    'Bogota': 'MX', // Se mapea a MX temporalmente si quieres que usen precios de MX o cámbialo a CO cuando tengas IDs
    // ARGENTINA
    'Buenos_Aires': 'AR',
    'Cordoba': 'AR',
    'Salta': 'AR',
    'Jujuy': 'AR',
    'Mendoza': 'AR',
    // CHILE
    'Santiago': 'CL',
    // PERÚ
    'Lima': 'PE',
    // COSTA RICA
    'Costa_Rica': 'MX', // Temporalmente MX si no hay ID propio
    // URUGUAY
    'Montevideo': 'UY',
    // BRASIL
    'Sao_Paulo': 'BR',
    'Rio_de_Janeiro': 'BR'
  }

  // Buscar coincidencia exacta o por inclusión de la ciudad
  const detected = Object.entries(tzMap).find(([city]) => timezone.includes(city))
  
  let country: CountryCode = detected ? detected[1] : 'US'

  // Refuerzo final por palabras clave si no se detectó por ciudad (o se detectó US por error)
  if (country === 'US') {
    const tzLower = timezone.toLowerCase()
    if (tzLower.includes('mexico')) country = 'MX'
    else if (tzLower.includes('bogota')) country = 'MX' // Mapeo temporal
    else if (tzLower.includes('buenos_aires') || tzLower.includes('argentina')) country = 'AR'
    else if (tzLower.includes('santiago') || tzLower.includes('chile')) country = 'CL'
    else if (tzLower.includes('lima') || tzLower.includes('peru')) country = 'PE'
    else if (tzLower.includes('montevideo') || tzLower.includes('uruguay')) country = 'UY'
    else if (tzLower.includes('costa_rica')) country = 'MX' // Mapeo temporal
  }
  
  console.log(`[Billing] País detectado final: ${country}`)
  return country
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
    '✅ Confia Drive AI Assistant (Agente)',
    '✅ Magic Create (Intención IA)',
    '✅ Dictado por Voz Inteligente',
    '✅ Confia Drive AI Insights & BI',
    '✅ Reportes avanzados',
    '✅ Soporte prioritario 24/7',
    '✅ Acceso a API',
    '✅ Marca personalizada'
  ],
  premium_only: [
    'WhatsApp con API oficial',
    'Confia Drive AI Assistant (Agente)',
    'Magic Create (Intención IA)',
    'Dictado por Voz Inteligente',
    'Confia Drive AI Insights & BI',
    'Usuarios ilimitados',
    'Reportes avanzados'
  ]
} as const

export const PLAN_NAMES = {
  free: 'Plan Free',
  premium: 'Plan Premium'
} as const

