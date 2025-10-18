#!/usr/bin/env node

/**
 * Script de Verificación de Variables de Entorno
 * Verifica que todas las variables necesarias estén configuradas correctamente
 */

const requiredVars = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'URL del proyecto Supabase',
    example: 'https://tu-proyecto.supabase.co',
    critical: true
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Clave anónima de Supabase',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    critical: true
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Clave de servicio de Supabase',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    critical: true
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'URL de la aplicación',
    example: 'http://localhost:3000',
    critical: true
  },
  {
    name: 'JWT_SECRET',
    description: 'Clave secreta para JWT',
    example: 'tu-jwt-secret-generado',
    critical: true
  },
  {
    name: 'ENCRYPTION_KEY',
    description: 'Clave de encriptación',
    example: 'tu-encryption-key-generado',
    critical: true
  },
  {
    name: 'NODE_ENV',
    description: 'Entorno de ejecución',
    example: 'development',
    critical: false
  },
  {
    name: 'LOG_LEVEL',
    description: 'Nivel de logging',
    example: 'debug',
    critical: false
  }
]

const optionalVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_AUTH_REDIRECT_URL',
  'NEXT_PUBLIC_LOGOUT_REDIRECT_URL',
  'DEBUG_QUERIES',
  'ENABLE_DETAILED_LOGGING',
  'DEBUG_MODE'
]

console.log('🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO')
console.log('==========================================\n')

let criticalErrors = 0
let warnings = 0
let configured = 0

// Verificar variables críticas
console.log('📋 VARIABLES CRÍTICAS:')
console.log('----------------------')

requiredVars.forEach(({ name, description, example, critical }) => {
  const value = process.env[name]
  
  if (!value) {
    console.log(`❌ ${name}: NO CONFIGURADA`)
    console.log(`   Descripción: ${description}`)
    console.log(`   Ejemplo: ${example}`)
    if (critical) criticalErrors++
    console.log('')
  } else if (value.includes('tu-') || value.includes('ejemplo') || value.includes('your_')) {
    console.log(`⚠️  ${name}: VALOR DE EJEMPLO`)
    console.log(`   Valor actual: ${value.substring(0, 20)}...`)
    console.log(`   Descripción: ${description}`)
    console.log(`   Ejemplo: ${example}`)
    if (critical) criticalErrors++
    warnings++
    console.log('')
  } else {
    console.log(`✅ ${name}: CONFIGURADA`)
    configured++
  }
})

// Verificar variables opcionales
console.log('\n📋 VARIABLES OPCIONALES:')
console.log('-------------------------')

optionalVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: CONFIGURADA`)
    configured++
  } else {
    console.log(`⚪ ${varName}: NO CONFIGURADA (opcional)`)
  }
})

// Resumen
console.log('\n📊 RESUMEN:')
console.log('============')
console.log(`✅ Variables configuradas: ${configured}`)
console.log(`⚠️  Advertencias: ${warnings}`)
console.log(`❌ Errores críticos: ${criticalErrors}`)

if (criticalErrors === 0) {
  console.log('\n🎉 ¡Todas las variables críticas están configuradas!')
  console.log('🚀 Tu aplicación debería funcionar correctamente.')
} else {
  console.log('\n⚠️  Hay errores críticos que deben corregirse.')
  console.log('📖 Consulta CONFIGURACION_VARIABLES_ENTORNO.md para más detalles.')
  process.exit(1)
}

// Verificar formato de URL de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
  console.log('\n⚠️  ADVERTENCIA: La URL de Supabase no parece válida.')
  console.log('   Debe ser: https://tu-proyecto.supabase.co')
}

// Verificar formato de claves
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (anonKey && !anonKey.startsWith('eyJ')) {
  console.log('\n⚠️  ADVERTENCIA: La clave anónima no parece válida.')
  console.log('   Debe empezar con "eyJ"')
}

console.log('\n🔧 COMANDOS ÚTILES:')
console.log('===================')
console.log('npm run diagnose     # Verificar conexión a Supabase')
console.log('npm run dev          # Iniciar servidor de desarrollo')
console.log('npm run build        # Construir para producción')





