/**
 * Sanitizadores y restricciones de input reutilizables.
 * Se usan en onChange para filtrar caracteres ANTES de que lleguen al state.
 *
 * Uso:
 *   <Input onChange={(e) => setPhone(sanitize.phone(e.target.value))} maxLength={10} />
 */

export const sanitize = {
  /** Solo dígitos. Ideal para teléfono, kilometraje, duración. */
  digitsOnly: (value: string): string => value.replace(/\D/g, ''),

  /** Teléfono: solo dígitos, máximo 10 */
  phone: (value: string): string => value.replace(/\D/g, '').slice(0, 10),

  /** Teléfono internacional: dígitos y +, máximo 15 */
  phoneInternational: (value: string): string =>
    value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 15),

  /** Placa: letras, dígitos y guiones, máximo 10, uppercase */
  plate: (value: string): string =>
    value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 10),

  /** VIN: alfanumérico sin I, O, Q (estándar ISO 3779), máximo 17, uppercase */
  vin: (value: string): string =>
    value.replace(/[^A-Za-z0-9]/g, '').replace(/[ioqIOQ]/g, '').toUpperCase().slice(0, 17),

  /** Año del vehículo: solo dígitos, máximo 4 caracteres */
  year: (value: string): string => value.replace(/\D/g, '').slice(0, 4),

  /** Kilometraje: solo dígitos (no decimales ni negativos) */
  mileage: (value: string): string => value.replace(/\D/g, ''),

  /** Moneda: dígitos, un punto decimal, máximo 2 decimales */
  currency: (value: string): string => {
    // Permitir dígitos y un solo punto
    let clean = value.replace(/[^\d.]/g, '')
    // Solo un punto decimal
    const parts = clean.split('.')
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('')
    }
    // Máximo 2 decimales
    if (parts.length === 2 && parts[1].length > 2) {
      clean = parts[0] + '.' + parts[1].slice(0, 2)
    }
    return clean
  },

  /** Nombre: letras (unicode), espacios, guiones, apóstrofos */
  name: (value: string): string => value.replace(/[^\p{L}\s'-]/gu, ''),

  /** Email: lowercase, sin espacios */
  email: (value: string): string => value.trim().toLowerCase(),

  /** Alfanumérico uppercase (genérico) */
  alphanumericUpper: (value: string): string =>
    value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
}

/** Constantes de límites para atributos HTML */
export const INPUT_LIMITS = {
  PHONE_MAX: 10,
  PHONE_INTL_MAX: 15,
  PLATE_MAX: 10,
  VIN_MAX: 17,
  YEAR_MIN: 1900,
  YEAR_MAX: new Date().getFullYear() + 1,
  MILEAGE_MAX: 9999999,
  DURATION_MIN: 1,
  DURATION_MAX: 1440, // 24 horas en minutos
} as const
