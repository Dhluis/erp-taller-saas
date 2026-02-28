/**
 * Detección de país y moneda para la app (onboarding / Configuración de empresa).
 * Usa la zona horaria del navegador; opcionalmente se puede combinar con IP en el servidor.
 */

import type { OrgCurrencyCode } from '@/lib/context/CurrencyContext'

export type DetectedCountryCode =
  | 'MX' | 'AR' | 'BR' | 'CL' | 'CO' | 'PE' | 'UY' | 'US'

const COUNTRY_TO_CURRENCY: Record<DetectedCountryCode, OrgCurrencyCode> = {
  MX: 'MXN',
  AR: 'ARS',
  BR: 'BRL',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  UY: 'UYU',
  US: 'USD',
}

const COUNTRY_NAMES: Record<DetectedCountryCode, string> = {
  MX: 'México',
  AR: 'Argentina',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Perú',
  UY: 'Uruguay',
  US: 'Estados Unidos',
}

export interface DetectedLocale {
  countryCode: DetectedCountryCode
  countryName: string
  currencyCode: OrgCurrencyCode
  /** Zona horaria usada para la detección (ej. America/Mexico_City) */
  timeZone: string
}

/**
 * Detecta país y moneda a partir de la zona horaria del navegador.
 * Se usa en Configuración de empresa para sugerir moneda/base_currency.
 */
export function detectLocaleFromTimezone(): DetectedLocale {
  const timeZone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC'

  let countryCode: DetectedCountryCode = 'US'

  if (timeZone.includes('Mexico')) countryCode = 'MX'
  else if (timeZone.includes('Argentina')) countryCode = 'AR'
  else if (timeZone.includes('Sao_Paulo') || timeZone.includes('Brasilia')) countryCode = 'BR'
  else if (timeZone.includes('Santiago')) countryCode = 'CL'
  else if (timeZone.includes('Bogota')) countryCode = 'CO'
  else if (timeZone.includes('Lima')) countryCode = 'PE'
  else if (timeZone.includes('Montevideo')) countryCode = 'UY'

  return {
    countryCode,
    countryName: COUNTRY_NAMES[countryCode],
    currencyCode: COUNTRY_TO_CURRENCY[countryCode],
    timeZone,
  }
}

/**
 * Indica si la moneda detectada es la misma que la guardada.
 */
export function isDetectedSameAsSaved(
  detected: DetectedLocale,
  savedCurrency: string | null | undefined
): boolean {
  if (!savedCurrency) return false
  return detected.currencyCode === savedCurrency
}
