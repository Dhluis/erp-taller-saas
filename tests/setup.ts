import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Configuración de variables de entorno para tests
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Limpiar después de cada test
afterEach(() => {
  cleanup()
})

// Configuración global de fetch para tests
global.fetch = global.fetch || fetch

console.log('🧪 Test environment configured')
console.log('   API URL:', process.env.NEXT_PUBLIC_API_URL)
console.log('   Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...')
