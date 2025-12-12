#!/usr/bin/env tsx
/**
 * Script para verificar variables de entorno
 * Ejecutar: npx tsx scripts/check-env.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') })

// Variables requeridas para el endpoint POST /api/users
const REQUIRED_VARS = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    description: 'URL de tu proyecto Supabase',
    example: 'https://xxxxx.supabase.co',
    whereToGet: 'Supabase Dashboard → Settings → API → Project URL'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    description: 'Clave anónima de Supabase (pública)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    whereToGet: 'Supabase Dashboard → Settings → API → anon public key'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    required: true, // Requerida para POST /api/users
    description: 'Clave de servicio de Supabase (privada)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    whereToGet: 'Supabase Dashboard → Settings → API → service_role key (⚠️ NO compartir)',
    secret: true
  }
}

// Variables opcionales pero recomendadas
const OPTIONAL_VARS = {
  'NEXT_PUBLIC_APP_URL': {
    description: 'URL de la aplicación',
    example: 'http://localhost:3000',
    default: 'http://localhost:3000'
  },
  'NODE_ENV': {
    description: 'Entorno de ejecución',
    example: 'development',
    default: 'development'
  }
}

interface ValidationResult {
  name: string
  status: '✅ OK' | '❌ FALTANTE' | '⚠️ INVÁLIDA'
  value?: string
  maskedValue?: string
  message?: string
}

function maskSecret(value: string): string {
  if (!value || value.length < 20) return '***'
  return `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
}

function validateUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function validateJWT(value: string): boolean {
  // JWT típicamente tiene formato: header.payload.signature
  return value.startsWith('eyJ') && value.includes('.') && value.split('.').length === 3
}

function checkVariables(): {
  required: ValidationResult[]
  optional: ValidationResult[]
  allValid: boolean
} {
  const required: ValidationResult[] = []
  const optional: ValidationResult[] = []

  // Verificar variables requeridas
  for (const [name, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[name]
    const result: ValidationResult = {
      name,
      status: '❌ FALTANTE'
    }

    if (!value) {
      result.message = `No encontrada. ${config.whereToGet}`
    } else {
      result.value = value
      
      if (config.secret) {
        result.maskedValue = maskSecret(value)
      }

      // Validar formato según el tipo
      if (name.includes('URL')) {
        if (validateUrl(value)) {
          result.status = '✅ OK'
        } else {
          result.status = '⚠️ INVÁLIDA'
          result.message = 'No es una URL válida'
        }
      } else if (name.includes('KEY')) {
        if (validateJWT(value)) {
          result.status = '✅ OK'
        } else {
          result.status = '⚠️ INVÁLIDA'
          result.message = 'No tiene formato JWT válido'
        }
      } else {
        result.status = '✅ OK'
      }
    }

    required.push(result)
  }

  // Verificar variables opcionales
  for (const [name, config] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[name]
    const result: ValidationResult = {
      name,
      status: value ? '✅ OK' : '⚠️ INVÁLIDA'
    }

    if (value) {
      result.value = value
      result.message = 'Configurada'
    } else {
      result.message = `No configurada (usará default: ${config.default || 'N/A'})`
    }

    optional.push(result)
  }

  const allValid = required.every(r => r.status === '✅ OK')

  return { required, optional, allValid }
}

function printResults(results: ReturnType<typeof checkVariables>) {
  console.log('\n🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO\n')
  console.log('=' .repeat(70))
  
  console.log('\n📋 VARIABLES REQUERIDAS:\n')
  for (const result of results.required) {
    const config = REQUIRED_VARS[result.name as keyof typeof REQUIRED_VARS]
    console.log(`${result.status} ${result.name}`)
    console.log(`   ${config.description}`)
    
    if (result.status === '✅ OK') {
      if (result.maskedValue) {
        console.log(`   Valor: ${result.maskedValue}`)
      } else {
        console.log(`   Valor: ${result.value?.substring(0, 50)}...`)
      }
    } else {
      console.log(`   ⚠️  ${result.message || 'No configurada'}`)
      console.log(`   📍 Obtener en: ${config.whereToGet}`)
    }
    console.log('')
  }

  console.log('\n📋 VARIABLES OPCIONALES:\n')
  for (const result of results.optional) {
    const config = OPTIONAL_VARS[result.name as keyof typeof OPTIONAL_VARS]
    console.log(`${result.status} ${result.name}`)
    console.log(`   ${config.description}`)
    if (result.value) {
      console.log(`   Valor: ${result.value}`)
    } else {
      console.log(`   ${result.message}`)
    }
    console.log('')
  }

  console.log('=' .repeat(70))
  
  if (results.allValid) {
    console.log('\n✅ TODAS LAS VARIABLES REQUERIDAS ESTÁN CONFIGURADAS CORRECTAMENTE\n')
    console.log('✨ El endpoint POST /api/users debería funcionar correctamente.\n')
    return 0
  } else {
    console.log('\n❌ FALTAN VARIABLES REQUERIDAS\n')
    console.log('⚠️  El endpoint POST /api/users NO funcionará sin SUPABASE_SERVICE_ROLE_KEY\n')
    console.log('📝 PASOS PARA CONFIGURAR:\n')
    console.log('1. Ve a tu proyecto en Supabase Dashboard')
    console.log('2. Settings → API')
    console.log('3. Copia la "service_role" key (⚠️  MANTÉNLA SECRETA)')
    console.log('4. Agrega a .env.local:')
    console.log('   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui\n')
    return 1
  }
}

// Ejecutar verificación
const results = checkVariables()
const exitCode = printResults(results)
process.exit(exitCode)

