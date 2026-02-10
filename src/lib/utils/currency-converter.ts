'use client'

import { useState, useEffect } from 'react'

/** Tasas de cambio aproximadas vs USD (actualizables). Para precisión usar API tipo exchangerate-api.com */
export const LATAM_CURRENCIES = {
  USD: { symbol: '$', name: 'Dólar', flag: '🇺🇸', rate: 1 },
  MXN: { symbol: '$', name: 'Peso Mexicano', flag: '🇲🇽', rate: 17.5 },
  COP: { symbol: '$', name: 'Peso Colombiano', flag: '🇨🇴', rate: 4200 },
  ARS: { symbol: '$', name: 'Peso Argentino', flag: '🇦🇷', rate: 850 },
  CLP: { symbol: '$', name: 'Peso Chileno', flag: '🇨🇱', rate: 950 },
  PEN: { symbol: 'S/', name: 'Sol Peruano', flag: '🇵🇪', rate: 3.7 },
  BRL: { symbol: 'R$', name: 'Real Brasileño', flag: '🇧🇷', rate: 5.8 },
  UYU: { symbol: '$', name: 'Peso Uruguayo', flag: '🇺🇾', rate: 42 },
} as const

export type CurrencyCode = keyof typeof LATAM_CURRENCIES

export function convertUSD(amountUSD: number, currency: CurrencyCode): number {
  return Math.round(amountUSD * LATAM_CURRENCIES[currency].rate)
}

export function formatLocalCurrency(amount: number, currency: CurrencyCode): string {
  const currencyInfo = LATAM_CURRENCIES[currency]
  return new Intl.NumberFormat('es-419', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Hook para usar en componentes: moneda seleccionada + detección por timezone */
export function useCurrencyConverter() {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD')

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const currencyMap: Record<string, CurrencyCode> = {
      'America/Mexico_City': 'MXN',
      'America/Bogota': 'COP',
      'America/Argentina/Buenos_Aires': 'ARS',
      'America/Santiago': 'CLP',
      'America/Lima': 'PEN',
      'America/Sao_Paulo': 'BRL',
      'America/Montevideo': 'UYU',
    }
    const detected = currencyMap[timezone] || 'USD'
    setSelectedCurrency(detected)
  }, [])

  return { selectedCurrency, setSelectedCurrency, convertUSD, formatLocalCurrency }
}
