/**
 * Test Simple para Verificar la Arquitectura
 * Test básico para verificar que la nueva arquitectura funciona
 */

import { describe, it, expect } from 'vitest'

describe('Arquitectura Unificada', () => {
  it('should load configuration', async () => {
    const { getConfig } = await import('../lib/core/config')
    const config = getConfig()
    
    expect(config).toBeDefined()
    expect(config.NODE_ENV).toBeDefined()
  })

  it('should load Supabase client', async () => {
    const { getSupabaseClient } = await import('../lib/supabase')
    const client = getSupabaseClient()
    
    expect(client).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it('should load error handling', async () => {
    const { handleError, AppError } = await import('../lib/core/errors')
    
    expect(handleError).toBeDefined()
    expect(AppError).toBeDefined()
  })

  it('should load collections service', async () => {
    const { collectionsService } = await import('../lib/services/collections-service')
    
    expect(collectionsService).toBeDefined()
    expect(collectionsService.getAll).toBeDefined()
  })

  it('should validate configuration', async () => {
    const { validateConfig } = await import('../lib/core/config')
    const validation = validateConfig()
    
    expect(validation).toBeDefined()
    expect(typeof validation.valid).toBe('boolean')
  })
})



