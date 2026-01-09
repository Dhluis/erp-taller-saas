/**
 * Utilidades para manejo de variables de entorno
 * 
 * IMPORTANTE: Vercel siempre agrega \r\n al final de las variables de entorno
 * cuando se configuran desde el dashboard. Esta función limpia automáticamente
 * esos caracteres para evitar problemas en producción.
 */

/**
 * Limpia variables de entorno eliminando espacios y saltos de línea
 * Corrige el bug conocido de Vercel que agrega \r\n al final
 */
export function cleanEnvVar(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/[\r\n]/g, '').trim();
}

/**
 * Obtiene la URL de la aplicación limpia
 * 
 * Estrategia:
 * 1. Usa NEXT_PUBLIC_APP_URL si está configurada y es correcta (incluye 'erp-taller-saas-correct')
 * 2. Fallback a VERCEL_PROJECT_PRODUCTION_URL si NEXT_PUBLIC_APP_URL no es correcta
 * 3. Último fallback: URL por defecto
 * 
 * Siempre limpia saltos de línea automáticamente
 */
export function getAppUrl(): string {
  const nextPublicUrl = cleanEnvVar(process.env.NEXT_PUBLIC_APP_URL);
  
  // Si la URL está configurada y es correcta, usarla
  if (nextPublicUrl && nextPublicUrl.includes('erp-taller-saas-correct')) {
    return nextPublicUrl.replace(/\/$/, ''); // Remover trailing slash
  }
  
  // Fallback a VERCEL_PROJECT_PRODUCTION_URL
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  
  // Último fallback
  return nextPublicUrl || 'https://erp-taller-saas-correct.vercel.app';
}

