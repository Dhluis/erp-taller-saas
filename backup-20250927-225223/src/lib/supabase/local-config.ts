/**
 * Configuración para Desarrollo Local con Supabase
 * Proporciona configuración específica para desarrollo local
 */

import { config } from '@/lib/config'

// Configuración de desarrollo local
export const LOCAL_CONFIG = {
  // URLs de desarrollo
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key',
  
  // Configuración de desarrollo
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Configuración de logging
  enableLogging: process.env.NODE_ENV === 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Configuración de debugging
  enableDebug: process.env.NODE_ENV === 'development',
  debugQueries: process.env.DEBUG_QUERIES === 'true',
  
  // Configuración de testing
  isTest: process.env.NODE_ENV === 'test',
  testDatabase: process.env.TEST_DATABASE_URL,
  
  // Configuración de autenticación
  authConfig: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const
  },
  
  // Configuración de conexión
  connectionConfig: {
    timeout: 10000,
    retries: 3,
    retryDelay: 1000
  },
  
  // Configuración de cache
  cacheConfig: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutos
    maxSize: 100
  }
}

/**
 * Verificar configuración de desarrollo
 */
export function validateLocalConfig(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Verificar variables de entorno
  if (!LOCAL_CONFIG.supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL no está configurado')
  }

  if (!LOCAL_CONFIG.supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurado')
  }

  // Verificar URLs de desarrollo
  if (LOCAL_CONFIG.isDevelopment) {
    if (LOCAL_CONFIG.supabaseUrl.includes('localhost')) {
      warnings.push('Usando Supabase local. Asegúrate de que esté ejecutándose')
    }
  }

  // Verificar configuración de producción
  if (LOCAL_CONFIG.isProduction) {
    if (LOCAL_CONFIG.supabaseUrl.includes('localhost')) {
      errors.push('No se puede usar localhost en producción')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Obtener configuración de Supabase para desarrollo
 */
export function getSupabaseConfig() {
  const validation = validateLocalConfig()
  
  if (!validation.isValid) {
    console.error('❌ Configuración de Supabase inválida:', validation.errors)
    throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`)
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Advertencias de configuración:', validation.warnings)
  }

  return {
    url: LOCAL_CONFIG.supabaseUrl,
    anonKey: LOCAL_CONFIG.supabaseAnonKey,
    serviceKey: LOCAL_CONFIG.supabaseServiceKey,
    options: {
      auth: LOCAL_CONFIG.authConfig,
      global: {
        headers: {
          'X-Client-Info': 'erp-taller-saas-local'
        }
      }
    }
  }
}

/**
 * Configuración de logging para desarrollo
 */
export function setupDevelopmentLogging() {
  if (!LOCAL_CONFIG.enableLogging) return

  // Configurar console.log para desarrollo
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  console.log = (...args) => {
    if (LOCAL_CONFIG.logLevel === 'debug' || LOCAL_CONFIG.logLevel === 'info') {
      originalLog('[DEV]', ...args)
    }
  }

  console.error = (...args) => {
    originalError('[DEV ERROR]', ...args)
  }

  console.warn = (...args) => {
    if (LOCAL_CONFIG.logLevel === 'debug' || LOCAL_CONFIG.logLevel === 'info' || LOCAL_CONFIG.logLevel === 'warn') {
      originalWarn('[DEV WARN]', ...args)
    }
  }
}

/**
 * Configuración de debugging para desarrollo
 */
export function setupDevelopmentDebugging() {
  if (!LOCAL_CONFIG.enableDebug) return

  // Exponer funciones de debugging en window para desarrollo
  if (typeof window !== 'undefined' && LOCAL_CONFIG.isDevelopment) {
    (window as any).__SUPABASE_DEBUG__ = {
      config: LOCAL_CONFIG,
      supabase: () => import('@/lib/supabase/client-robust').then(m => m.getBrowserClient()),
      testConnection: () => import('@/lib/supabase/client-robust').then(m => m.testConnection()),
      getCurrentUser: () => import('@/lib/supabase/client-robust').then(m => m.getCurrentUser()),
      isAuthenticated: () => import('@/lib/supabase/client-robust').then(m => m.isAuthenticated())
    }
  }
}

/**
 * Configuración de testing
 */
export function setupTestingConfig() {
  if (!LOCAL_CONFIG.isTest) return

  // Configuración específica para testing
  return {
    supabaseUrl: LOCAL_CONFIG.testDatabase || LOCAL_CONFIG.supabaseUrl,
    anonKey: LOCAL_CONFIG.supabaseAnonKey,
    options: {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  }
}

/**
 * Inicializar configuración de desarrollo
 */
export function initializeDevelopmentConfig() {
  // Configurar logging
  setupDevelopmentLogging()
  
  // Configurar debugging
  setupDevelopmentDebugging()
  
  // Validar configuración
  const validation = validateLocalConfig()
  
  if (!validation.isValid) {
    throw new Error(`Configuración de desarrollo inválida: ${validation.errors.join(', ')}`)
  }
  
  console.log('✅ Configuración de desarrollo inicializada')
}

/**
 * Obtener información de configuración para debugging
 */
export function getConfigInfo() {
  return {
    environment: process.env.NODE_ENV,
    supabaseUrl: LOCAL_CONFIG.supabaseUrl,
    hasAnonKey: !!LOCAL_CONFIG.supabaseAnonKey,
    hasServiceKey: !!LOCAL_CONFIG.supabaseServiceKey,
    isDevelopment: LOCAL_CONFIG.isDevelopment,
    isProduction: LOCAL_CONFIG.isProduction,
    isTest: LOCAL_CONFIG.isTest,
    enableLogging: LOCAL_CONFIG.enableLogging,
    enableDebug: LOCAL_CONFIG.enableDebug,
    debugQueries: LOCAL_CONFIG.debugQueries
  }
}
