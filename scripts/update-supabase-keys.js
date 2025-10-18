#!/usr/bin/env node

/**
 * Script para actualizar las claves de Supabase en .env.local
 */

const fs = require('fs')
const path = require('path')

// Claves reales de Supabase
const supabaseKeys = {
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1MjAsImV4cCI6MjA3NDMwODUyMH0.u3EAXSQTT87R2O5vHMyGE0hFLKLcB6LjkgHqkKclx2Q',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI'
}

function updateSupabaseKeys() {
  const envPath = '.env.local'
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found')
    return false
  }

  try {
    let content = fs.readFileSync(envPath, 'utf8')
    let modified = false

    // Actualizar cada clave
    Object.entries(supabaseKeys).forEach(([key, value]) => {
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
      console.log('\n✅ Supabase keys updated successfully!')
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
  console.log('🔄 Updating Supabase keys...\n')
  
  const success = updateSupabaseKeys()
  
  if (success) {
    console.log('\n📋 Next steps:')
    console.log('1. Run: npm run env:check')
    console.log('2. Run: npm run dev')
    console.log('3. Test: http://localhost:3001')
  }
}

main()





