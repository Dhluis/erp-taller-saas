#!/usr/bin/env node

/**
 * Script de Validación de Configuración
 * Verifica que todas las variables de entorno estén configuradas correctamente
 */

const fs = require('fs')
const path = require('path')

// Colores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue')
}

// Variables de entorno requeridas
const REQUIRED_VARS = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    type: 'url',
    description: 'URL de tu proyecto Supabase'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    type: 'jwt',
    description: 'Clave anónima de Supabase'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    required: false,
    type: 'jwt',
    description: 'Clave de servicio de Supabase (opcional)'
  },
  'NEXT_PUBLIC_APP_URL': {
    required: true,
    type: 'url',
    description: 'URL de la aplicación'
  },
  'NODE_ENV': {
    required: true,
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Entorno de ejecución'
  }
}

// Variables de entorno opcionales
const OPTIONAL_VARS = {
  'LOG_LEVEL': {
    type: 'enum',
    values: ['debug', 'info', 'warn', 'error'],
    description: 'Nivel de logging'
  },
  'DEBUG_QUERIES': {
    type: 'boolean',
    description: 'Habilitar debugging de queries'
  },
  'ENABLE_DETAILED_LOGGING': {
    type: 'boolean',
    description: 'Habilitar logging detallado'
  }
}

/**
 * Validar tipo de variable
 */
function validateType(value, type, options = {}) {
  switch (type) {
    case 'url':
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    
    case 'jwt':
      return value.startsWith('eyJ') && value.includes('.')
    
    case 'boolean':
      return ['true', 'false', '1', '0'].includes(value.toLowerCase())
    
    case 'enum':
      return options.values ? options.values.includes(value) : true
    
    case 'string':
      return typeof value === 'string' && value.length > 0
    
    default:
      return true
  }
}

/**
 * Validar variables de entorno
 */
function validateEnvironment() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  }

  // Validar variables requeridas
  for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[varName]
    
    if (!value) {
      if (config.required) {
        results.errors.push(`Variable requerida faltante: ${varName}`)
        results.valid = false
      }
    } else {
      if (!validateType(value, config.type, config)) {
        results.errors.push(`Variable ${varName} tiene formato inválido`)
        results.valid = false
      } else {
        results.info.push(`✅ ${varName}: ${config.description}`)
      }
    }
  }

  // Validar variables opcionales
  for (const [varName, config] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[varName]
    
    if (value) {
      if (!validateType(value, config.type, config)) {
        results.warnings.push(`Variable opcional ${varName} tiene formato inválido`)
      } else {
        results.info.push(`✅ ${varName}: ${config.description}`)
      }
    }
  }

  return results
}

/**
 * Validar archivo .env.local
 */
function validateEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  
  if (!fs.existsSync(envPath)) {
    return {
      exists: false,
      message: 'Archivo .env.local no encontrado'
    }
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8')
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    
    return {
      exists: true,
      lines: lines.length,
      message: `Archivo .env.local encontrado con ${lines.length} variables`
    }
  } catch (error) {
    return {
      exists: true,
      error: error.message,
      message: 'Error leyendo archivo .env.local'
    }
  }
}

/**
 * Validar configuración de Supabase
 */
function validateSupabaseConfig() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url) {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname.includes('supabase.co')) {
        results.info.push('✅ URL de Supabase válida')
      } else {
        results.warnings.push('⚠️ URL de Supabase no parece ser oficial')
      }
    } catch {
      results.errors.push('❌ URL de Supabase inválida')
      results.valid = false
    }
  }

  if (anonKey) {
    if (anonKey.startsWith('eyJ')) {
      results.info.push('✅ Clave anónima de Supabase válida')
    } else {
      results.errors.push('❌ Clave anónima de Supabase inválida')
      results.valid = false
    }
  }

  return results
}

/**
 * Mostrar resumen de configuración
 */
function showConfigSummary() {
  log('\n📋 Resumen de Configuración:', 'bright')
  log('================================', 'bright')
  
  const envFile = validateEnvFile()
  if (envFile.exists) {
    logSuccess(envFile.message)
  } else {
    logError(envFile.message)
  }

  const envValidation = validateEnvironment()
  if (envValidation.valid) {
    logSuccess('Variables de entorno válidas')
  } else {
    logError('Variables de entorno inválidas')
    envValidation.errors.forEach(error => logError(error))
  }

  const supabaseValidation = validateSupabaseConfig()
  if (supabaseValidation.valid) {
    logSuccess('Configuración de Supabase válida')
  } else {
    logError('Configuración de Supabase inválida')
    supabaseValidation.errors.forEach(error => logError(error))
  }

  if (envValidation.warnings.length > 0) {
    logWarning('Advertencias:')
    envValidation.warnings.forEach(warning => logWarning(warning))
  }

  if (supabaseValidation.warnings.length > 0) {
    logWarning('Advertencias de Supabase:')
    supabaseValidation.warnings.forEach(warning => logWarning(warning))
  }
}

/**
 * Mostrar información de debugging
 */
function showDebugInfo() {
  log('\n🔍 Información de Debugging:', 'bright')
  log('================================', 'bright')
  
  logInfo(`Node.js: ${process.version}`)
  logInfo(`Plataforma: ${process.platform}`)
  logInfo(`Directorio: ${process.cwd()}`)
  logInfo(`Entorno: ${process.env.NODE_ENV || 'undefined'}`)
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    logInfo(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    logInfo(`App URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
  }
}

/**
 * Mostrar instrucciones de configuración
 */
function showSetupInstructions() {
  log('\n📖 Instrucciones de Configuración:', 'bright')
  log('====================================', 'bright')
  
  logInfo('1. Copia el archivo de ejemplo:')
  log('   cp env.example .env.local')
  
  logInfo('2. Configura las variables de entorno en .env.local:')
  log('   - NEXT_PUBLIC_SUPABASE_URL')
  log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  log('   - SUPABASE_SERVICE_ROLE_KEY (opcional)')
  
  logInfo('3. Verifica que tu proyecto Supabase esté configurado:')
  log('   - Tablas creadas')
  log('   - Políticas RLS configuradas')
  log('   - Datos de ejemplo insertados')
  
  logInfo('4. Ejecuta el script de validación:')
  log('   node scripts/validate-config.js')
  
  logInfo('5. Inicia el servidor de desarrollo:')
  log('   npm run dev')
}

/**
 * Función principal
 */
function main() {
  log('🔧 Validando Configuración del Proyecto', 'bright')
  log('========================================', 'bright')
  
  // Validar archivo .env.local
  const envFile = validateEnvFile()
  if (!envFile.exists) {
    logError('Archivo .env.local no encontrado')
    showSetupInstructions()
    process.exit(1)
  }

  // Validar variables de entorno
  const envValidation = validateEnvironment()
  const supabaseValidation = validateSupabaseConfig()

  // Mostrar resultados
  showConfigSummary()
  showDebugInfo()

  // Mostrar instrucciones si hay errores
  if (!envValidation.valid || !supabaseValidation.valid) {
    showSetupInstructions()
    process.exit(1)
  }

  logSuccess('¡Configuración válida! El proyecto está listo para ejecutarse.')
}

// Ejecutar script
if (require.main === module) {
  main()
}

module.exports = {
  validateEnvironment,
  validateEnvFile,
  validateSupabaseConfig,
  showConfigSummary,
  showDebugInfo,
  showSetupInstructions
}







