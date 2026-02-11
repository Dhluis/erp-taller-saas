import { LATAM_CURRENCIES, type CurrencyCode } from '@/lib/utils/currency-converter'

interface CachedRates {
  rates: Record<string, number>
  lastUpdate: number
  nextUpdate: number
}

const CACHE_KEY = 'exchange_rates_cache'
const CACHE_HOURS = parseInt(process.env.NEXT_PUBLIC_EXCHANGE_RATE_CACHE_HOURS || '24', 10)

/**
 * Obtiene tasas de cambio actualizadas (con caché de 24h por defecto).
 * En el cliente llama a /api/exchange-rates para no exponer la API key.
 */
export async function getExchangeRates(): Promise<Record<CurrencyCode, number>> {
  try {
    // 1. Verificar caché (solo en cliente)
    const cached = getCachedRates()
    if (cached && !isCacheExpired(cached)) {
      console.log('📊 [ExchangeRates] Usando tasas en caché')
      return cached.rates as Record<CurrencyCode, number>
    }

    // 2. Cliente: llamar a nuestra API (la key está solo en servidor)
    console.log('🌐 [ExchangeRates] Obteniendo tasas actualizadas...')

    const isClient = typeof window !== 'undefined'
    const url = isClient ? '/api/exchange-rates' : undefined

    if (!url) {
      return getDefaultRates()
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API respondió con status ${response.status}`)
    }

    const json: { rates: Record<string, number>; lastUpdate?: number } = await response.json()
    const rates = json.rates as Record<CurrencyCode, number>
    if (!rates || typeof rates.USD !== 'number') {
      throw new Error('Respuesta inválida de exchange-rates')
    }

    // 3. Guardar en caché (solo en cliente)
    const cacheData: CachedRates = {
      rates,
      lastUpdate: json.lastUpdate || Date.now(),
      nextUpdate: (json.lastUpdate || Date.now()) + CACHE_HOURS * 3600 * 1000,
    }
    try {
      if (isClient) localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
      console.warn('⚠️ [ExchangeRates] No se pudo guardar en localStorage:', e)
    }

    console.log('✅ [ExchangeRates] Tasas actualizadas:', rates)
    return rates
  } catch (error) {
    console.error('❌ [ExchangeRates] Error obteniendo tasas:', error)

    const cached = getCachedRates()
    if (cached) {
      console.warn('⚠️ [ExchangeRates] Usando caché expirado como fallback')
      return cached.rates as Record<CurrencyCode, number>
    }

    console.warn('⚠️ [ExchangeRates] Usando tasas por defecto como fallback')
    return getDefaultRates()
  }
}

function getCachedRates(): CachedRates | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedRates
  } catch {
    return null
  }
}

function isCacheExpired(cache: CachedRates): boolean {
  const now = Date.now()
  const expiresAt = cache.lastUpdate + CACHE_HOURS * 3600 * 1000
  return now > expiresAt
}

function getDefaultRates(): Record<CurrencyCode, number> {
  return Object.entries(LATAM_CURRENCIES).reduce(
    (acc, [code, info]) => ({ ...acc, [code]: info.rate }),
    {} as Record<CurrencyCode, number>
  )
}

/**
 * Fuerza actualización de tasas (limpia caché y vuelve a pedir).
 */
export async function forceUpdateRates(): Promise<Record<CurrencyCode, number>> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      // ignore
    }
  }
  return getExchangeRates()
}
