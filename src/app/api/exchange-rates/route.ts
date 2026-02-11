import { NextResponse } from 'next/server'
import type { CurrencyCode } from '@/lib/utils/currency-converter'

interface ExchangeRateResponse {
  result: string
  base_code: string
  conversion_rates: Record<string, number>
  time_last_update_unix?: number
  time_next_update_unix?: number
}

const API_KEY = process.env.EXCHANGE_RATE_API_KEY

const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  MXN: 17.5,
  COP: 4200,
  ARS: 850,
  CLP: 950,
  PEN: 3.7,
  BRL: 5.8,
  UYU: 42,
}

/**
 * GET /api/exchange-rates
 * Devuelve tasas vs USD para monedas LATAM.
 * La API key solo se usa en servidor; el cliente llama aquí para no exponerla.
 */
export async function GET() {
  try {
    if (!API_KEY) {
      console.warn('[API exchange-rates] EXCHANGE_RATE_API_KEY no configurada')
      return NextResponse.json({ rates: DEFAULT_RATES })
    }

    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`,
      { next: { revalidate: 24 * 3600 } }
    )

    if (!response.ok) {
      throw new Error(`Exchange API: ${response.status}`)
    }

    const data: ExchangeRateResponse = await response.json()
    if (data.result !== 'success') {
      throw new Error('Exchange API: resultado no exitoso')
    }

    const cr = data.conversion_rates || {}
    const rates: Record<CurrencyCode, number> = {
      USD: 1,
      MXN: cr.MXN || 17.5,
      COP: cr.COP || 4200,
      ARS: cr.ARS || 850,
      CLP: cr.CLP || 950,
      PEN: cr.PEN || 3.7,
      BRL: cr.BRL || 5.8,
      UYU: cr.UYU || 42,
    }

    return NextResponse.json({
      rates,
      lastUpdate: data.time_last_update_unix
        ? data.time_last_update_unix * 1000
        : Date.now(),
    })
  } catch (error) {
    console.error('[API exchange-rates] Error:', error)
    return NextResponse.json({ rates: DEFAULT_RATES }, { status: 200 })
  }
}
