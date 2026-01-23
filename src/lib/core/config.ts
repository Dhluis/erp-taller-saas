/**
 * Configuración Centralizada y Robusta
 * Única fuente de verdad para toda la configuración de la aplicación
 */

import { z } from 'zod'

// Esquema de validación para variables de entorno
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(100, 'NEXT_PUBLIC_SUPABASE_ANON_KEY debe ser válida'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Aplicación
  NEXT_PUBLIC_APP_URL: z.string()
    .refine(
      (val) => {
        if (!val) return true; // opcional
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'NEXT_PUBLIC_APP_URL debe ser una URL válida (ej: https://tudominio.com)' }
    )
    .optional()
    .default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  
  // Logging y Debugging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEBUG_QUERIES: z.boolean().default(false),
  ENABLE_DETAILED_LOGGING: z.boolean().default(true),
  
  // Base de datos
  DATABASE_URL: z.string().optional(),
  
  // Autenticación
  NEXT_PUBLIC_AUTH_REDIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_LOGOUT_REDIRECT_URL: z.string().url().optional(),
  
  // Seguridad
  JWT_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.number().default(100),
  RATE_LIMIT_REQUESTS_PER_HOUR: z.number().default(1000),
  
  // Cache
  CACHE_TTL: z.number().default(300),
  CACHE_MAX_SIZE: z.number().default(100),
  
  // Uploads
  MAX_FILE_SIZE_MB: z.number().default(10),
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,application/pdf'),
  
  // Desarrollo
  DEBUG_MODE: z.boolean().default(false),
  HOT_RELOAD: z.boolean().default(true),
  DEV_PORT: z.number().default(3000),
  
  // Testing
  ENABLE_AUTO_TESTS: z.boolean().default(true),
  MIN_TEST_COVERAGE: z.number().default(80),
  TEST_TIMEOUT: z.number().default(30),
})

// Tipo de configuración validada
export type AppConfig = z.infer<typeof envSchema>

// Singleton para configuración
let configInstance: AppConfig | null = null
let configErrors: string[] = []

/**
 * Validar y obtener configuración
 */
export function getConfig(): AppConfig {
  if (configInstance) {
    return configInstance
  }

  try {
    // Parsear variables de entorno
    const rawEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      LOG_LEVEL: process.env.LOG_LEVEL,
      DEBUG_QUERIES: process.env.DEBUG_QUERIES === 'true',
      ENABLE_DETAILED_LOGGING: process.env.ENABLE_DETAILED_LOGGING === 'true',
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_AUTH_REDIRECT_URL: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL,
      NEXT_PUBLIC_LOGOUT_REDIRECT_URL: process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      RATE_LIMIT_REQUESTS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
      RATE_LIMIT_REQUESTS_PER_HOUR: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '1000'),
      CACHE_TTL: parseInt(process.env.CACHE_TTL || '300'),
      CACHE_MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE || '100'),
      MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),
      ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES,
      DEBUG_MODE: process.env.DEBUG_MODE === 'true',
      HOT_RELOAD: process.env.HOT_RELOAD === 'true',
      DEV_PORT: parseInt(process.env.DEV_PORT || '3000'),
      ENABLE_AUTO_TESTS: process.env.ENABLE_AUTO_TESTS === 'true',
      MIN_TEST_COVERAGE: parseInt(process.env.MIN_TEST_COVERAGE || '80'),
      TEST_TIMEOUT: parseInt(process.env.TEST_TIMEOUT || '30'),
    }

    // Validar con Zod
    const result = envSchema.safeParse(rawEnv)
    
    if (!result.success) {
      configErrors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
      throw new Error(`Configuración inválida: ${configErrors.join(', ')}`)
    }

    configInstance = result.data
    console.log('✅ Configuración validada y cargada correctamente')
    return configInstance
  } catch (error) {
    console.error('❌ Error validando configuración:', error)
    throw error
  }
}

/**
 * Validar configuración sin lanzar errores
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  try {
    getConfig()
    return { valid: true, errors: [] }
  } catch (error) {
    return { valid: false, errors: configErrors }
  }
}

/**
 * Obtener información de configuración para debugging
 */
export function getConfigInfo() {
  const config = getConfig()
  
  return {
    environment: config.NODE_ENV,
    appVersion: config.NEXT_PUBLIC_APP_VERSION,
    appUrl: config.NEXT_PUBLIC_APP_URL,
    supabase: {
      url: config.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!config.SUPABASE_SERVICE_ROLE_KEY,
      isConfigured: !!(config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    },
    logging: {
      level: config.LOG_LEVEL,
      debugQueries: config.DEBUG_QUERIES,
      detailedLogging: config.ENABLE_DETAILED_LOGGING
    },
    security: {
      hasJwtSecret: !!config.JWT_SECRET,
      hasEncryptionKey: !!config.ENCRYPTION_KEY
    },
    performance: {
      rateLimit: {
        perMinute: config.RATE_LIMIT_REQUESTS_PER_MINUTE,
        perHour: config.RATE_LIMIT_REQUESTS_PER_HOUR
      },
      cache: {
        ttl: config.CACHE_TTL,
        maxSize: config.CACHE_MAX_SIZE
      }
    },
    timestamp: new Date().toISOString()
  }
}

/**
 * Limpiar configuración (para testing)
 */
export function clearConfig() {
  configInstance = null
  configErrors = []
}