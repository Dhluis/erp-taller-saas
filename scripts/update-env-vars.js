#!/usr/bin/env node

/**
 * Script para actualizar variables de entorno en .env.local
 */

const fs = require('fs')
const path = require('path')

// Variables a actualizar
const updates = {
  'JWT_SECRET': '5HBodVy3SNXjFwTwAoQ/aUFxBwTz70un4Qs01qhTmC1cQW5Oqx+Po1xmi9ROXqrQIfcc8b8QxsvYz17PWAeguw==',
  'ENCRYPTION_KEY': 'ePjK80Re7FCrd/termIBNPCsESrhHt43WMlzLds34io=',
  'NODE_ENV': 'development',
  'LOG_LEVEL': 'debug'
}

function updateEnvFile() {
  const envPath = '.env.local'
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found')
    return false
  }

  try {
    let content = fs.readFileSync(envPath, 'utf8')
    let modified = false

    // Actualizar cada variable
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm')
      const newLine = `${key}=${value}`
      
      if (content.includes(`${key}=`)) {
        content = content.replace(regex, newLine)
        console.log(`✅ Updated ${key}`)
        modified = true
      } else {
        // Agregar al final si no existe
        content += `\n${newLine}`
        console.log(`✅ Added ${key}`)
        modified = true
      }
    })

    if (modified) {
      fs.writeFileSync(envPath, content, 'utf8')
      console.log('\n✅ .env.local updated successfully!')
      return true
    } else {
      console.log('\n⚠️ No changes needed')
      return false
    }
  } catch (error) {
    console.error('❌ Error updating .env.local:', error.message)
    return false
  }
}

function main() {
  console.log('🔄 Updating environment variables...\n')
  
  const success = updateEnvFile()
  
  if (success) {
    console.log('\n📋 Next steps:')
    console.log('1. Configure your Supabase URL and keys in .env.local')
    console.log('2. Run: npm run env:check')
    console.log('3. Run: npm run dev')
  }
}

main()





