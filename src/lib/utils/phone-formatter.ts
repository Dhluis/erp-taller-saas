/**
 * Utilidades para formateo de números de teléfono
 * Especialmente para números mexicanos
 */

/**
 * Normalizar número de teléfono (remover caracteres no numéricos)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Formatear número de teléfono mexicano
 * Ejemplo: 524491698635 -> +52 449 169 86 35
 */
export function formatMexicanPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  
  const normalized = normalizePhone(phone)
  
  // Números mexicanos: 52 (país) + 10 dígitos
  // Formato: +52 XXX XXX XX XX
  if (normalized.length === 12 && normalized.startsWith('52')) {
    const areaCode = normalized.substring(2, 5) // 449
    const firstPart = normalized.substring(5, 8) // 169
    const secondPart = normalized.substring(8, 10) // 86
    const thirdPart = normalized.substring(10) // 35
    return `+52 ${areaCode} ${firstPart} ${secondPart} ${thirdPart}`
  }
  
  // Si tiene 10 dígitos, asumir que es número mexicano sin código de país
  if (normalized.length === 10) {
    const areaCode = normalized.substring(0, 3)
    const firstPart = normalized.substring(3, 6)
    const secondPart = normalized.substring(6, 8)
    const thirdPart = normalized.substring(8)
    return `+52 ${areaCode} ${firstPart} ${secondPart} ${thirdPart}`
  }
  
  // Para otros formatos, intentar formateo genérico
  if (normalized.length > 10) {
    // Números internacionales largos
    if (normalized.length === 13) {
      return `+${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`
    }
    if (normalized.length === 12) {
      return `+${normalized.substring(0, 2)} ${normalized.substring(2, 5)} ${normalized.substring(5, 8)} ${normalized.substring(8)}`
    }
  }
  
  // Si no coincide con ningún formato conocido, devolver con +
  return `+${normalized}`
}

/**
 * Obtener nombre para mostrar (nombre o teléfono formateado)
 */
export function getDisplayName(
  name: string | null | undefined,
  phone: string | null | undefined
): string {
  // Si hay nombre válido, usarlo
  if (name && name.trim() && name !== 'Cliente WhatsApp') {
    return name.trim()
  }
  
  // Si hay teléfono, formatearlo
  if (phone) {
    return formatMexicanPhone(phone)
  }
  
  // Por defecto
  return 'Cliente WhatsApp'
}
