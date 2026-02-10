'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from './SessionContext'

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
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'es-ES', rateFromUSD: 0.92 },
} as const

export type OrgCurrencyCode = keyof typeof SUPPORTED_CURRENCIES

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
  /** Convierte entre monedas (from → to vía USD) */
  convertBetweenCurrencies: (amount: number, from: OrgCurrencyCode, to: OrgCurrencyCode) => number
  /** Convierte USD a la moneda de visualización y formatea */
  convertAndFormat: (amountUSD: number) => string
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
        const { data, error } = await supabase
          .from('company_settings')
          .select('currency, base_currency')
          .eq('organization_id', organizationId)
          .single()

        if (!error && data) {
          if (data.currency && data.currency in SUPPORTED_CURRENCIES) {
            const dbCurrency = data.currency as OrgCurrencyCode
            _setCurrency(dbCurrency)
            localStorage.setItem(`${STORAGE_KEY}_${organizationId}`, dbCurrency)
          }
          const base = (data as { base_currency?: string }).base_currency
          if (base && base in SUPPORTED_CURRENCIES) {
            setBaseCurrency(base as OrgCurrencyCode)
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

  const currencyInfo = SUPPORTED_CURRENCIES[currency]

  /** Convierte de fromCurrency (o baseCurrency) a moneda de visualización y formatea */
  const formatMoney = useCallback((amount: number, fromCurrency?: OrgCurrencyCode) => {
    const from = fromCurrency ?? baseCurrency
    const converted = convertBetweenCurrencies(amount, from, currency)
    return formatInCurrency(converted, currency)
  }, [currency, baseCurrency])

  const convertAndFormat = useCallback((amountUSD: number) => {
    const converted = convertFromUSD(amountUSD, currency)
    return formatInCurrency(converted, currency)
  }, [currency])

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        baseCurrency,
        currencyInfo,
        setCurrency,
        formatMoney,
        convertBetweenCurrencies,
        convertAndFormat,
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
      isLoading: false,
    }
  }
  return context
}
