/**
 * Utilidades para optimización específica de móvil
 */

/**
 * Obtener tamaño de página optimizado según dispositivo
 */
export function getOptimizedPageSize(isMobile: boolean, baseSize: number = 20): number {
  return isMobile ? Math.min(baseSize, 10) : baseSize
}

/**
 * Obtener límite de elementos para renderizar inicialmente en móvil
 */
export function getInitialRenderLimit(isMobile: boolean, defaultLimit: number = 20): number {
  return isMobile ? Math.min(defaultLimit, 6) : defaultLimit
}

/**
 * Verificar si debe usar virtualización según cantidad de items
 */
export function shouldUseVirtualization(itemCount: number, isMobile: boolean): boolean {
  // En móvil, usar virtualización con menos items
  return isMobile ? itemCount > 20 : itemCount > 50
}

/**
 * Obtener tamaño de imagen optimizado según dispositivo
 */
export function getOptimizedImageSize(isMobile: boolean, baseSize: number = 1920): number {
  return isMobile ? Math.min(baseSize, 1200) : baseSize
}

/**
 * Obtener calidad de imagen optimizada según dispositivo
 */
export function getOptimizedImageQuality(isMobile: boolean, baseQuality: number = 0.8): number {
  return isMobile ? Math.min(baseQuality, 0.65) : baseQuality
}

