/**
 * Utilidades para formateo de números de teléfono
 * Especialmente para números mexicanos
 */

/**
 * Normaliza un número de teléfono removiendo caracteres no numéricos
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  // Remover todos los caracteres no numéricos (más robusto que solo espacios y signos)
  return phone.replace(/\D/g, '')
}

/**
 * Formatea un número de teléfono mexicano al formato: +52 XXX XXX XX XX
 * 
 * Acepta números en formato:
 * - 524491698635 (12 dígitos con código país) → +52 449 169 86 35 ✅ FORMATO ESTÁNDAR EN BD
 * - 4491698635 (10 dígitos sin código país) → +52 449 169 86 35
 * - +524491698635 → +52 449 169 86 35
 * - 5214491698635 (13 dígitos con 1 adicional) → +52 449 169 86 35
 */
export function formatMexicanPhone(phone: string | null | undefined): string {
  if (!phone) return 'N/A'
  
  // Normalizar: solo números
  const normalized = normalizePhone(phone)
  
  // Si está vacío, devolver como está
  if (!normalized) return phone
  
  // ✅ CASO 1: Número con código de país (52) de 12 dígitos: 524491698635
  // Este es el formato ESTÁNDAR que guardamos en la BD
  if (normalized.length === 12 && normalized.startsWith('52')) {
    const areaCode = normalized.substring(2, 5)  // 449
    const firstPart = normalized.substring(5, 8)  // 169
    const secondPart = normalized.substring(8, 10) // 86
    const thirdPart = normalized.substring(10, 12) // 35
    return `+52 ${areaCode} ${firstPart} ${secondPart} ${thirdPart}`
  }
  
  // Caso 2: Número sin código de país de 10 dígitos: 4491698635
  if (normalized.length === 10) {
    const areaCode = normalized.substring(0, 3)   // 449
    const firstPart = normalized.substring(3, 6)   // 169
    const secondPart = normalized.substring(6, 8)  // 86
    const thirdPart = normalized.substring(8, 10)  // 35
    return `+52 ${areaCode} ${firstPart} ${secondPart} ${thirdPart}`
  }
  
  // Caso 3: Número con código de país de 13 dígitos (con 1 adicional): 5214491698635
  if (normalized.length === 13 && normalized.startsWith('521')) {
    const areaCode = normalized.substring(3, 6)   // 449
    const firstPart = normalized.substring(6, 9)   // 169
    const secondPart = normalized.substring(9, 11) // 86
    const thirdPart = normalized.substring(11, 13) // 35
    return `+52 ${areaCode} ${firstPart} ${secondPart} ${thirdPart}`
  }
  
  // Si no coincide con ningún patrón conocido, intentar formatear lo mejor posible
  // Asumir que es un número de 10 dígitos sin código de país
  if (normalized.length >= 10) {
    const last10 = normalized.slice(-10)
    const areaCode = last10.substring(0, 3)
    const firstPart = last10.substring(3, 6)
    const secondPart = last10.substring(6, 8)
    const thirdPart = last10.substring(8, 10)
    return `+52 ${areaCode} ${firstPart} ${secondPart} ${thirdPart}`
  }
  
  // Si es muy corto o no tiene formato reconocible, devolver con +52
  return `+52 ${normalized}`
}

/**
 * Normaliza un número de teléfono para asegurar formato consistente en WhatsApp
 * 
 * Para México (52):
 * - Formato correcto: 52 + 1 + 10 dígitos = 13 dígitos
 * - Ejemplo: 5214494533160
 * 
 * Esta función asegura que todos los números mexicanos tengan el formato consistente
 * para evitar duplicados en conversaciones de WhatsApp.
 * 
 * @param phoneNumber - Número en cualquier formato
 * @returns Número normalizado (13 dígitos para México: 52 + 1 + 10 dígitos)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';

  // 1. Extraer solo dígitos
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // 2. Si está vacío o muy corto, retornar como está
  if (!digitsOnly || digitsOnly.length < 10) {
    return digitsOnly;
  }

  // 3. Detectar si es número mexicano (empieza con 52)
  if (digitsOnly.startsWith('52')) {
    const withoutCountryCode = digitsOnly.substring(2); // Remover "52"

    // Si tiene 13 dígitos (52 + 1 + 10), ya tiene el "1" y está correcto
    if (digitsOnly.length === 13) {
      // Verificar que después del 52 viene un "1"
      if (withoutCountryCode.startsWith('1')) {
        return digitsOnly; // Ya está correcto: 5214494533160
      }
      // Si tiene 13 dígitos pero no empieza con "1" después del 52, corregir
      // Ejemplo: 5244945331600 (12 dígitos después del 52, pero 13 total)
      // Esto no debería pasar, pero por seguridad lo manejamos
      if (withoutCountryCode.length === 11) {
        return `521${withoutCountryCode.substring(1)}`; // 52 + 1 + últimos 10
      }
    }

    // Si tiene 12 dígitos (52 + 10), agregar "1" después del "52"
    if (digitsOnly.length === 12 && withoutCountryCode.length === 10) {
      return `521${withoutCountryCode}`; // Insertar "1": 52 + 1 + 4494533160
    }

    // Si tiene 11 dígitos después del 52 pero no empieza con "1", agregarlo
    if (digitsOnly.length === 13 && !withoutCountryCode.startsWith('1')) {
      return `521${withoutCountryCode.substring(1)}`; // 52 + 1 + últimos 10
    }

    // Si tiene más de 13 dígitos, tomar los primeros 13 (52 + 1 + 10)
    if (digitsOnly.length > 13) {
      const first13 = digitsOnly.substring(0, 13);
      if (first13.startsWith('521')) {
        return first13;
      }
      // Si no empieza con 521, intentar corregir
      if (first13.startsWith('52') && first13.length === 13) {
        return `521${first13.substring(2, 12)}`; // 52 + 1 + siguientes 10
      }
    }
  }

  // 4. Para otros países o formatos no reconocidos, retornar solo dígitos
  return digitsOnly;
}

/**
 * Obtiene un nombre formateado para display basado en nombre o teléfono
 */
export function getDisplayName(name: string | null | undefined, phone: string | null | undefined): string {
  // Si hay nombre y no es genérico, usarlo
  if (name && name !== 'Cliente WhatsApp' && name.trim() !== '') {
    return name
  }
  
  // Si hay teléfono, formatearlo y usarlo
  if (phone) {
    return formatMexicanPhone(phone)
  }
  
  // Fallback
  return 'Cliente WhatsApp'
}
