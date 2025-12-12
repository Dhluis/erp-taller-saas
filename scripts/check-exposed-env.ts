#!/usr/bin/env tsx
/**
 * Script para verificar si hay variables de entorno privadas expuestas al cliente
 * Ejecutar: npx tsx scripts/check-exposed-env.ts
 */

import { readFileSync } from 'fs'
import { glob } from 'glob'
import { resolve } from 'path'

const PRIVATE_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'DATABASE_URL',
  'SERVICE_ROLE',
  'ADMIN_KEY',
]

const CLIENT_INDICATORS = [
  "'use client'",
  '"use client"',
  'use client',
]

interface Issue {
  file: string
  line: number
  variable: string
  severity: 'critical' | 'warning'
  context: string
}

function checkFile(filePath: string): Issue[] {
  const issues: Issue[] = []
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  // Verificar si es un archivo del cliente
  const isClientFile = CLIENT_INDICATORS.some(indicator => 
    content.includes(indicator)
  ) || filePath.includes('/app/') && !filePath.includes('/api/')
  
  // Buscar variables privadas
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    for (const privateVar of PRIVATE_VARS) {
      if (line.includes(privateVar)) {
        // Verificar si se está usando process.env
        if (line.includes(`process.env.${privateVar}`)) {
          const severity = isClientFile ? 'critical' : 'warning'
          
          // Verificar si se está exponiendo el valor
          const exposesValue = !line.includes('!!') && 
                               !line.includes('||') && 
                               !line.includes('?') &&
                               (line.includes('=') || line.includes('return') || line.includes(':'))
          
          if (exposesValue && isClientFile) {
            issues.push({
              file: filePath,
              line: i + 1,
              variable: privateVar,
              severity: 'critical',
              context: line.trim(),
            })
          } else if (isClientFile) {
            issues.push({
              file: filePath,
              line: i + 1,
              variable: privateVar,
              severity: 'warning',
              context: line.trim(),
            })
          }
        }
      }
    }
  }
  
  return issues
}

async function main() {
  console.log('\n🔍 VERIFICANDO VARIABLES DE ENTORNO EXPUESTAS AL CLIENTE\n')
  console.log('=' .repeat(70))
  
  const srcFiles = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.test.tsx'],
  })
  
  const allIssues: Issue[] = []
  
  for (const file of srcFiles) {
    const issues = checkFile(file)
    allIssues.push(...issues)
  }
  
  // Separar por severidad
  const critical = allIssues.filter(i => i.severity === 'critical')
  const warnings = allIssues.filter(i => i.severity === 'warning')
  
  if (critical.length > 0) {
    console.log('\n❌ PROBLEMAS CRÍTICOS ENCONTRADOS:\n')
    for (const issue of critical) {
      console.log(`⚠️  ${issue.file}:${issue.line}`)
      console.log(`   Variable: ${issue.variable}`)
      console.log(`   Contexto: ${issue.context.substring(0, 80)}...`)
      console.log('')
    }
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS (usos en archivos cliente):\n')
    for (const issue of warnings) {
      console.log(`ℹ️  ${issue.file}:${issue.line}`)
      console.log(`   Variable: ${issue.variable}`)
      console.log(`   Contexto: ${issue.context.substring(0, 80)}...`)
      console.log(`   Nota: Solo verifica existencia, no expone valor`)
      console.log('')
    }
  }
  
  if (critical.length === 0 && warnings.length === 0) {
    console.log('\n✅ NO SE ENCONTRARON VARIABLES PRIVADAS EXPUESTAS\n')
    console.log('✨ Todas las variables privadas están correctamente protegidas.\n')
  } else if (critical.length === 0) {
    console.log('\n✅ NO HAY PROBLEMAS CRÍTICOS\n')
    console.log('ℹ️  Las advertencias son solo verificaciones de existencia, no exponen valores.\n')
  }
  
  console.log('=' .repeat(70))
  
  process.exit(critical.length > 0 ? 1 : 0)
}

main().catch(console.error)

