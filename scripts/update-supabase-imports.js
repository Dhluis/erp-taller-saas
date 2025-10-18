#!/usr/bin/env node

/**
 * Script para actualizar todos los imports de Supabase
 * Reemplaza getBrowserClient por getSupabaseClient en todos los archivos
 */

const fs = require('fs')
const path = require('path')

// Directorios a procesar
const directories = [
  'src/lib/supabase',
  'src/app',
  'src/components'
]

// Patrones a reemplazar
const replacements = [
  {
    from: "import { getBrowserClient } from '../core/supabase'",
    to: "import { getSupabaseClient } from '../supabase'"
  },
  {
    from: "import { getBrowserClient } from '../../core/supabase'",
    to: "import { getSupabaseClient } from '../../supabase'"
  },
  {
    from: "import { getBrowserClient } from '../../../core/supabase'",
    to: "import { getSupabaseClient } from '../../../supabase'"
  },
  {
    from: "getBrowserClient()",
    to: "getSupabaseClient()"
  }
]

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to)
        modified = true
      }
    })

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Updated: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return false
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return
  }

  const items = fs.readdirSync(dirPath)
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      processDirectory(fullPath)
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      processFile(fullPath)
    }
  })
}

function main() {
  console.log('🔄 Updating Supabase imports...\n')
  
  let totalUpdated = 0
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Processing directory: ${dir}`)
      processDirectory(dir)
    }
  })
  
  console.log('\n✅ Import update completed!')
  console.log('\n📋 Next steps:')
  console.log('1. Run: npm run dev')
  console.log('2. Check for any remaining errors')
  console.log('3. Test the application')
}

main()





