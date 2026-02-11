'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './SessionContext'
import { getExchangeRates } from '@/lib/services/exchange-rates'

/**
 * Monedas soportadas por la plataforma.
 * Las tasas son solo para referencia visual en planes; la moneda operativa
 * se guarda en company_settings.currency de cada organización.
 */
export const SUPPORTED_CURRENCIES = {
  MXN: { symbol: '$', name: 'Peso Mexicano', flag: '🇲🇽', locale: 'es-MX', rateFromUSD: 17.5 },
  USD: { symbol: '$', name: 'Dólar', flag: '🇺🇸', locale: 'en-US', rateFromUSD: 1 },
  COP: { symbol: '$', name: 'Peso Colombiano', flag: '🇨🇴', locale: 'es-CO', rateFromUSD: 4200 },
  ARS: { symbol: '$', name: 'Peso Argentino', flag: '🇦🇷', locale: 'es-AR', rateFromUSD: 850 },
  CLP: { symbol: '$', name: 'Peso Chileno', flag: '🇨🇱', locale: 'es-CL', rateFromUSD: 950 },
  PEN: { symbol: 'S/', name: 'Sol Peruano', flag: '🇵🇪', locale: 'es-PE', rateFromUSD: 3.7 },
  BRL: { symbol: 'R$', name: 'Real Brasileño', flag: '🇧🇷', locale: 'pt-BR', rateFromUSD: 5.8 },
  UYU: { symbol: '$', name: 'Peso Uruguayo', flag: '🇺🇾', locale: 'es-UY', rateFromUSD: 42 },
} as const

export type OrgCurrencyCode = keyof typeof SUPPORTED_CURRENCIES

/** Tasas por defecto (fallback cuando la API no está disponible) */
function getDefaultRates(): Record<OrgCurrencyCode, number> {
  return Object.fromEntries(
    (Object.entries(SUPPORTED_CURRENCIES) as [OrgCurrencyCode, (typeof SUPPORTED_CURRENCIES)[OrgCurrencyCode]][])
      .map(([code, info]) => [code, info.rateFromUSD])
  ) as Record<OrgCurrencyCode, number>
}

/** Convierte un monto de USD a la moneda indicada usando las tasas locales */
export function convertFromUSD(amountUSD: number, target: OrgCurrencyCode): number {
  return Math.round(amountUSD * SUPPORTED_CURRENCIES[target].rateFromUSD)
}

/** Formatea un monto en una moneda específica */
export function formatInCurrency(amount: number, code: OrgCurrencyCode): string {
  const info = SUPPORTED_CURRENCIES[code]
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Convierte entre dos monedas pasando por USD como intermedia */
export function convertBetweenCurrencies(
  amount: number,
  from: OrgCurrencyCode,
  to: OrgCurrencyCode
): number {
  if (from === to) return amount
  const amountInUSD = amount / SUPPORTED_CURRENCIES[from].rateFromUSD
  const convertedAmount = amountInUSD * SUPPORTED_CURRENCIES[to].rateFromUSD
  return Math.round(convertedAmount * 100) / 100
}

interface CurrencyContextType {
  /** Moneda seleccionada para visualización */
  currency: OrgCurrencyCode
  /** Moneda base del taller (en la que están almacenados los montos) */
  baseCurrency: OrgCurrencyCode
  /** Info de la moneda actual */
  currencyInfo: (typeof SUPPORTED_CURRENCIES)[OrgCurrencyCode]
  /** Cambiar la moneda de visualización (persiste en BD) */
  setCurrency: (code: OrgCurrencyCode) => Promise<void>
  /** Formatear un monto: convierte de fromCurrency (o baseCurrency) a currency y formatea */
  formatMoney: (amount: number, fromCurrency?: OrgCurrencyCode) => string
  /** Convierte entre monedas (from → to vía USD) con tasas en tiempo real */
  convertBetweenCurrencies: (amount: number, from: OrgCurrencyCode, to: OrgCurrencyCode) => number
  /** Convierte USD a la moneda de visualización y formatea */
  convertAndFormat: (amountUSD: number) => string
  /** Actualizar tasas de cambio manualmente */
  refreshRates: () => Promise<void>
  /** Si está cargando la moneda */
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

const STORAGE_KEY = 'org_currency'

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { organizationId, isReady } = useSession()
  const [currency, _setCurrency] = useState<OrgCurrencyCode>('MXN')
  const [baseCurrency, setBaseCurrency] = useState<OrgCurrencyCode>('MXN')
  const [isLoading, setIsLoading] = useState(true)
  const [exchangeRates, setExchangeRates] = useState<Record<OrgCurrencyCode, number> | null>(null)

  // Cargar tasas de cambio al montar (si la API falla se usan tasas por defecto)
  useEffect(() => {
    let cancelled = false
    async function loadRates() {
      try {
        const raw = await getExchangeRates()
        if (!cancelled) {
          setExchangeRates({ ...getDefaultRates(), ...raw } as Record<OrgCurrencyCode, number>)
        }
      } catch (err) {
        console.warn('[CurrencyProvider] Error cargando tasas, usando por defecto:', err)
        if (!cancelled) setExchangeRates(null)
      }
    }
    loadRates()
    return () => { cancelled = true }
  }, [])

  // Cargar moneda de visualización y moneda base desde company_settings
  useEffect(() => {
    if (!isReady || !organizationId) {
      setIsLoading(false)
      return
    }

    const loadCurrency = async () => {
      try {
        const cached = localStorage.getItem(`${STORAGE_KEY}_${organizationId}`)
        if (cached && cached in SUPPORTED_CURRENCIES) {
          _setCurrency(cached as OrgCurrencyCode)
        }

        const supabase = createClient()
        // Intentar con ambas columnas; si falla (ej. 406 por base_currency no migrada), solo currency
        let data: { currency?: string; base_currency?: string } | null = null

        const res = await supabase
          .from('company_settings')
          .select('currency, base_currency')
          .eq('organization_id', organizationId)
          .single()

        if (!res.error && res.data) {
          data = res.data as { currency?: string; base_currency?: string }
        } else if (res.error) {
          // Fallback: solo currency (por si base_currency no existe aún o 406)
          const fallback = await supabase
            .from('company_settings')
            .select('currency')
            .eq('organization_id', organizationId)
            .single()
          if (!fallback.error && fallback.data) {
            data = fallback.data as { currency?: string }
          }
        }

        if (data) {
          if (data.currency && data.currency in SUPPORTED_CURRENCIES) {
            const dbCurrency = data.currency as OrgCurrencyCode
            _setCurrency(dbCurrency)
            localStorage.setItem(`${STORAGE_KEY}_${organizationId}`, dbCurrency)
          }
          if (data.base_currency && data.base_currency in SUPPORTED_CURRENCIES) {
            setBaseCurrency(data.base_currency as OrgCurrencyCode)
          }
        }
      } catch (err) {
        console.warn('[CurrencyProvider] Error cargando moneda:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrency()
  }, [organizationId, isReady])

  const setCurrency = useCallback(async (code: OrgCurrencyCode) => {
    if (!organizationId) return
    _setCurrency(code)
    localStorage.setItem(`${STORAGE_KEY}_${organizationId}`, code)
    try {
      const supabase = createClient()
      await supabase
        .from('company_settings')
        .update({ currency: code })
        .eq('organization_id', organizationId)
    } catch (err) {
      console.error('[CurrencyProvider] Error al guardar moneda:', err)
    }
  }, [organizationId])

  const refreshRates = useCallback(async () => {
    try {
      const raw = await getExchangeRates()
      setExchangeRates({ ...getDefaultRates(), ...raw } as Record<OrgCurrencyCode, number>)
    } catch (err) {
      console.warn('[CurrencyProvider] Error actualizando tasas:', err)
    }
  }, [])

  const rates = exchangeRates ?? getDefaultRates()

  const convertBetweenCurrenciesLive = useCallback(
    (amount: number, from: OrgCurrencyCode, to: OrgCurrencyCode): number => {
      if (from === to) return amount
      const amountInUSD = amount / rates[from]
      const convertedAmount = amountInUSD * rates[to]
      return Math.round(convertedAmount * 100) / 100
    },
    [rates]
  )

  const convertFromUSDLive = useCallback(
    (amountUSD: number, target: OrgCurrencyCode): number =>
      Math.round(amountUSD * rates[target] * 100) / 100,
    [rates]
  )

  const currencyInfo = SUPPORTED_CURRENCIES[currency]

  /** Convierte de fromCurrency (o baseCurrency) a moneda de visualización y formatea */
  const formatMoney = useCallback(
    (amount: number, fromCurrency?: OrgCurrencyCode) => {
      const from = fromCurrency ?? baseCurrency
      const converted = convertBetweenCurrenciesLive(amount, from, currency)
      return formatInCurrency(converted, currency)
    },
    [currency, baseCurrency, convertBetweenCurrenciesLive]
  )

  const convertAndFormat = useCallback(
    (amountUSD: number) => {
      const converted = convertFromUSDLive(amountUSD, currency)
      return formatInCurrency(converted, currency)
    },
    [currency, convertFromUSDLive]
  )

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        baseCurrency,
        currencyInfo,
        setCurrency,
        formatMoney,
        convertBetweenCurrencies: convertBetweenCurrenciesLive,
        convertAndFormat,
        refreshRates,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

/**
 * Hook para usar la moneda de la organización en cualquier componente.
 *
 * @example
 * ```tsx
 * const { currency, formatMoney } = useOrgCurrency()
 * return <span>{formatMoney(1500)}</span> // "$1,500.00 MXN"
 * ```
 */
export function useOrgCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    return {
      currency: 'MXN' as OrgCurrencyCode,
      baseCurrency: 'MXN' as OrgCurrencyCode,
      currencyInfo: SUPPORTED_CURRENCIES.MXN,
      setCurrency: async () => {},
      formatMoney: (amount: number, _from?: OrgCurrencyCode) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount),
      convertBetweenCurrencies,
      convertAndFormat: (amountUSD: number) =>
        formatInCurrency(convertFromUSD(amountUSD, 'MXN'), 'MXN'),
      refreshRates: async () => {},
      isLoading: false,
    }
  }
  return context
}
