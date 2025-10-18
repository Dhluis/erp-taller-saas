/**
 * Sistema de Configuración Centralizada
 * Maneja todas las variables de entorno y configuraciones de la aplicación
 */

export interface AppConfig {
  supabase: {
    url: string
    anonKey: string
    serviceRoleKey?: string
  }
  app: {
    name: string
    version: string
    environment: 'development' | 'production' | 'test'
  }
  features: {
    enableAnalytics: boolean
    enableNotifications: boolean
    enableMultiTenancy: boolean
  }
}

// Configuración por defecto
const defaultConfig: AppConfig = {
  supabase: {
    url: '',
    anonKey: '',
    serviceRoleKey: ''
  },
  app: {
    name: 'EAGLES ERP',
    version: '1.0.0',
    environment: 'development'
  },
  features: {
    enableAnalytics: true,
    enableNotifications: true,
    enableMultiTenancy: true
  }
}

// Función para cargar configuración desde variables de entorno
function loadConfig(): AppConfig {
  const config: AppConfig = {
    ...defaultConfig,
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    app: {
      ...defaultConfig.app,
      environment: (process.env.NODE_ENV as any) || 'development'
    }
  }

  return config
}

// Configuración global
export const config = loadConfig()

/**
 * Valida que la configuración sea correcta
 * @throws {Error} Si la configuración es inválida
 */
export function validateConfig(): void {
  const errors: string[] = []

  // Validar Supabase
  if (!config.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  } else if (!config.supabase.url.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL')
  }

  if (!config.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  // Validar que la URL de Supabase sea válida
  if (config.supabase.url && !config.supabase.url.includes('.supabase.co')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL')
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
  }
}

/**
 * Verifica si estamos en modo desarrollo
 */
export function isDevelopment(): boolean {
  return config.app.environment === 'development'
}

/**
 * Verifica si estamos en modo producción
 */
export function isProduction(): boolean {
  return config.app.environment === 'production'
}

/**
 * Obtiene la configuración de Supabase
 */
export function getSupabaseConfig() {
  return config.supabase
}

/**
 * Obtiene la configuración de la aplicación
 */
export function getAppConfig() {
  return config.app
}

/**
 * Obtiene las características habilitadas
 */
export function getFeatures() {
  return config.features
}
