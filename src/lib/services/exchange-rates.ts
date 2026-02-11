import { LATAM_CURRENCIES, type CurrencyCode } from '@/lib/utils/currency-converter'

interface ExchangeRateResponse {
  result: string
  base_code: string
  conversion_rates: Record<string, number>
  time_last_update_unix: number
  time_next_update_unix: number
}

interface CachedRates {
  rates: Record<string, number>
  lastUpdate: number
  nextUpdate: number
}

const CACHE_KEY = 'exchange_rates_cache'
const API_KEY = process.env.EXCHANGE_RATE_API_KEY
const CACHE_HOURS = parseInt(process.env.NEXT_PUBLIC_EXCHANGE_RATE_CACHE_HOURS || '24', 10)

/**
 * Obtiene tasas de cambio actualizadas (con caché de 24h por defecto).
 * En servidor no usa localStorage; en cliente usa caché local + fallbacks.
 */
export async function getExchangeRates(): Promise<Record<CurrencyCode, number>> {
  try {
    // 1. Verificar caché (solo en cliente)
    const cached = getCachedRates()
    if (cached && !isCacheExpired(cached)) {
      console.log('📊 [ExchangeRates] Usando tasas en caché')
      return cached.rates as Record<CurrencyCode, number>
    }

    // 2. Fetch de API
    console.log('🌐 [ExchangeRates] Obteniendo tasas actualizadas...')

    if (!API_KEY) {
      console.warn('⚠️ [ExchangeRates] API key no configurada, usando tasas por defecto')
      return getDefaultRates()
    }

    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`,
      { next: { revalidate: CACHE_HOURS * 3600 } }
    )

    if (!response.ok) {
      throw new Error(`API respondió con status ${response.status}`)
    }

    const data: ExchangeRateResponse = await response.json()

    if (data.result !== 'success') {
      throw new Error('API retornó resultado no exitoso')
    }

    const cr = data.conversion_rates || {}

    // 3. Mapear a nuestras monedas (solo LATAM; EUR eliminado)
    const rates: Record<string, number> = {
      USD: 1,
      MXN: cr.MXN || 17.5,
      COP: cr.COP || 4200,
      ARS: cr.ARS || 850,
      CLP: cr.CLP || 950,
      PEN: cr.PEN || 3.7,
      BRL: cr.BRL || 5.8,
      UYU: cr.UYU || 42,
    }

    // 4. Guardar en caché (solo en cliente)
    const cacheData: CachedRates = {
      rates,
      lastUpdate: (data.time_last_update_unix || Math.floor(Date.now() / 1000)) * 1000,
      nextUpdate: (data.time_next_update_unix || 0) * 1000,
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      } catch (e) {
        console.warn('⚠️ [ExchangeRates] No se pudo guardar en localStorage:', e)
      }
    }

    console.log('✅ [ExchangeRates] Tasas actualizadas:', rates)
    return rates as Record<CurrencyCode, number>
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
