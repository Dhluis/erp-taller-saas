/**
 * Cliente MercadoPago para servidor.
 * Estructura similar a Stripe: validación de env, exports de Payment y Preference.
 * Inicialización perezosa para no fallar en build cuando la env no está definida.
 */
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? ''
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurada')
  }
  return token
}

let mercadopagoConfig: MercadoPagoConfig | null = null

function getConfig(): MercadoPagoConfig {
  if (!mercadopagoConfig) {
    mercadopagoConfig = new MercadoPagoConfig({
      accessToken: getAccessToken(),
      options: {
        timeout: 5000,
      },
    })
  }
  return mercadopagoConfig
}

export function getMercadoPagoConfig(): MercadoPagoConfig {
  return getConfig()
}

let _paymentClient: Payment | null = null
let _preferenceClient: Preference | null = null

export function getPaymentClient(): Payment {
  if (!_paymentClient) _paymentClient = new Payment(getConfig())
  return _paymentClient
}

export function getPreferenceClient(): Preference {
  if (!_preferenceClient) _preferenceClient = new Preference(getConfig())
  return _preferenceClient
}
