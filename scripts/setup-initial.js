/**
 * Script de configuración inicial
 * Configura el proyecto con valores por defecto para desarrollo
 */

const fs = require('fs')
const path = require('path')

function setupInitial() {
  console.log('🚀 Configurando proyecto inicial...')
  
  // 1. Verificar archivo .env.local
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.log('📄 Creando archivo .env.local...')
    const envExamplePath = path.join(__dirname, '..', 'env.example')
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath)
      console.log('✅ Archivo .env.local creado desde env.example')
    } else {
      console.log('⚠️ Archivo env.example no encontrado')
    }
  } else {
    console.log('✅ Archivo .env.local ya existe')
  }
  
  // 2. Crear directorio de logs si no existe
  const logsDir = path.join(__dirname, '..', 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
    console.log('✅ Directorio de logs creado')
  }
  
  // 3. Crear archivo de configuración de desarrollo
  const devConfigPath = path.join(__dirname, '..', 'src', 'lib', 'dev-config.ts')
  if (!fs.existsSync(devConfigPath)) {
    const devConfig = `/**
 * Configuración de desarrollo
 * Valores por defecto para desarrollo local
 */

export const devConfig = {
  supabase: {
    url: 'http://localhost:54321',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  },
  app: {
    url: 'http://localhost:3000',
    version: '1.0.0',
    environment: 'development'
  },
  logging: {
    level: 'debug',
    enableDetailedLogging: true,
    enableDebugQueries: true
  }
}
`
    fs.writeFileSync(devConfigPath, devConfig)
    console.log('✅ Configuración de desarrollo creada')
  }
  
  // 4. Crear archivo de datos de prueba
  const testDataPath = path.join(__dirname, '..', 'src', 'lib', 'test-data.ts')
  if (!fs.existsSync(testDataPath)) {
    const testData = `/**
 * Datos de prueba para desarrollo
 * Datos de ejemplo para testing y desarrollo
 */

export const testData = {
  organizations: [
    {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Default Organization',
      slug: 'default',
      description: 'Default organization for development',
      is_active: true
    }
  ],
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true
    }
  ],
  customers: [
    {
      id: '00000000-0000-0000-0000-000000000002',
      organization_id: '00000000-0000-0000-0000-000000000000',
      name: 'Cliente de Prueba',
      email: 'cliente@example.com',
      phone: '+1234567890',
      is_active: true
    }
  ],
  suppliers: [
    {
      id: '00000000-0000-0000-0000-000000000003',
      organization_id: '00000000-0000-0000-0000-000000000000',
      name: 'Proveedor de Prueba',
      email: 'proveedor@example.com',
      phone: '+1234567890',
      is_active: true
    }
  ]
}
`
    fs.writeFileSync(testDataPath, testData)
    console.log('✅ Datos de prueba creados')
  }
  
  console.log('🎉 Configuración inicial completada!')
  console.log('📋 Próximos pasos:')
  console.log('   1. Configura las variables de entorno en .env.local')
  console.log('   2. Ejecuta la migración: npm run migrate')
  console.log('   3. Inicia el servidor: npm run dev')
  console.log('   4. Visita http://localhost:3000/test-arquitectura')
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  setupInitial()
}

module.exports = { setupInitial }







