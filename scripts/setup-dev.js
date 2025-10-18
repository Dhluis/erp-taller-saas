#!/usr/bin/env node

/**
 * Script de Configuración de Desarrollo
 * Configura el entorno de desarrollo local
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

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

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan')
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

// Verificar si Node.js está instalado
function checkNodeVersion() {
  try {
    const version = process.version
    const majorVersion = parseInt(version.slice(1).split('.')[0])
    
    if (majorVersion < 18) {
      logError('Node.js 18+ es requerido. Versión actual: ' + version)
      process.exit(1)
    }
    
    logSuccess(`Node.js ${version} detectado`)
  } catch (error) {
    logError('Error verificando versión de Node.js: ' + error.message)
    process.exit(1)
  }
}

// Verificar si npm está instalado
function checkNpm() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim()
    logSuccess(`npm ${version} detectado`)
  } catch (error) {
    logError('npm no está instalado')
    process.exit(1)
  }
}

// Crear archivo .env.local si no existe
function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  const envExamplePath = path.join(process.cwd(), 'env.example')
  
  if (fs.existsSync(envPath)) {
    logInfo('.env.local ya existe')
    return
  }
  
  if (fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath)
      logSuccess('.env.local creado desde env.example')
    } catch (error) {
      logError('Error copiando env.example: ' + error.message)
    }
  } else {
    // Crear .env.local básico
    const envContent = `# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_aqui

# Configuración de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Configuración de logging y debugging
LOG_LEVEL=info
DEBUG_QUERIES=false
`
    
    try {
      fs.writeFileSync(envPath, envContent)
      logSuccess('.env.local creado con configuración básica')
    } catch (error) {
      logError('Error creando .env.local: ' + error.message)
    }
  }
}

// Instalar dependencias
function installDependencies() {
  try {
    logInfo('Instalando dependencias...')
    execSync('npm install', { stdio: 'inherit' })
    logSuccess('Dependencias instaladas')
  } catch (error) {
    logError('Error instalando dependencias: ' + error.message)
    process.exit(1)
  }
}

// Verificar configuración de Supabase
function checkSupabaseConfig() {
  const envPath = path.join(process.cwd(), '.env.local')
  
  if (!fs.existsSync(envPath)) {
    logWarning('.env.local no encontrado')
    return
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  if (envContent.includes('tu-proyecto.supabase.co')) {
    logWarning('Configuración de Supabase no configurada')
    logInfo('Por favor, configura las variables de entorno en .env.local')
  } else {
    logSuccess('Configuración de Supabase detectada')
  }
}

// Crear directorios necesarios
function createDirectories() {
  const directories = [
    'src/lib/supabase',
    'src/hooks',
    'src/types',
    'src/lib/errors',
    'src/lib/config',
    'src/lib/utils',
    'src/components/ui',
    'src/__tests__',
    'docs'
  ]
  
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir)
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true })
        logSuccess(`Directorio creado: ${dir}`)
      } catch (error) {
        logError(`Error creando directorio ${dir}: ${error.message}`)
      }
    }
  })
}

// Verificar configuración de TypeScript
function checkTypeScriptConfig() {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
  
  if (!fs.existsSync(tsconfigPath)) {
    logWarning('tsconfig.json no encontrado')
    return
  }
  
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
    
    if (!tsconfig.compilerOptions) {
      logWarning('tsconfig.json no tiene compilerOptions')
      return
    }
    
    logSuccess('Configuración de TypeScript verificada')
  } catch (error) {
    logError('Error leyendo tsconfig.json: ' + error.message)
  }
}

// Verificar configuración de Next.js
function checkNextConfig() {
  const nextConfigPath = path.join(process.cwd(), 'next.config.js')
  const nextConfigMjsPath = path.join(process.cwd(), 'next.config.mjs')
  
  if (!fs.existsSync(nextConfigPath) && !fs.existsSync(nextConfigMjsPath)) {
    logWarning('next.config.js no encontrado')
    return
  }
  
  logSuccess('Configuración de Next.js verificada')
}

// Mostrar información de configuración
function showConfigInfo() {
  log('\n📋 Información de Configuración:', 'bright')
  log('================================', 'bright')
  
  logInfo('Variables de entorno requeridas:')
  log('  - NEXT_PUBLIC_SUPABASE_URL')
  log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  log('  - SUPABASE_SERVICE_ROLE_KEY (opcional)')
  
  logInfo('Comandos útiles:')
  log('  - npm run dev          # Iniciar servidor de desarrollo')
  log('  - npm run build        # Construir para producción')
  log('  - npm run test         # Ejecutar tests')
  log('  - npm run lint         # Ejecutar linter')
  
  logInfo('URLs de desarrollo:')
  log('  - http://localhost:3000           # Aplicación principal')
  log('  - http://localhost:3000/test-fase1 # Test Fase 1')
  log('  - http://localhost:3000/test-fase2 # Test Fase 2')
  log('  - http://localhost:3000/test-fase3 # Test Fase 3')
  log('  - http://localhost:3000/test-fase4 # Test Fase 4')
  log('  - http://localhost:3000/test-fase5 # Test Fase 5')
}

// Función principal
function main() {
  log('🚀 Configurando entorno de desarrollo...', 'bright')
  log('==========================================', 'bright')
  
  // Verificaciones básicas
  logStep(1, 'Verificando Node.js')
  checkNodeVersion()
  
  logStep(2, 'Verificando npm')
  checkNpm()
  
  // Configuración del proyecto
  logStep(3, 'Creando directorios necesarios')
  createDirectories()
  
  logStep(4, 'Creando archivo de configuración')
  createEnvFile()
  
  logStep(5, 'Instalando dependencias')
  installDependencies()
  
  // Verificaciones de configuración
  logStep(6, 'Verificando configuración de Supabase')
  checkSupabaseConfig()
  
  logStep(7, 'Verificando configuración de TypeScript')
  checkTypeScriptConfig()
  
  logStep(8, 'Verificando configuración de Next.js')
  checkNextConfig()
  
  // Mostrar información final
  showConfigInfo()
  
  log('\n🎉 ¡Configuración completada!', 'green')
  log('================================', 'green')
  logInfo('Siguiente paso: Configura las variables de entorno en .env.local')
  logInfo('Luego ejecuta: npm run dev')
}

// Ejecutar script
if (require.main === module) {
  main()
}

module.exports = {
  checkNodeVersion,
  checkNpm,
  createEnvFile,
  installDependencies,
  checkSupabaseConfig,
  createDirectories,
  checkTypeScriptConfig,
  checkNextConfig,
  showConfigInfo
}







