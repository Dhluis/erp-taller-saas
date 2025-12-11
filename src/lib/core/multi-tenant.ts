/**
 * Multi-Tenant Helper Functions - CLIENT SIDE
 * Para usar en componentes de React con 'use client'
 * 
 * Para API routes y Server Components, usa: @/lib/core/multi-tenant-server
 */

'use client'

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// =====================================================
// TYPES
// =====================================================

export interface TenantContext {
  organizationId: string
  workshopId: string
  userId: string
}

export interface OrganizationInfo {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
}

export interface WorkshopInfo {
  id: string
  name: string
  organization_id: string
  email?: string
  phone?: string
  address?: string
}

// =====================================================
// CLIENT-SIDE FUNCTIONS (React Components)
// =====================================================

/**
 * Obtiene el contexto del tenant en el cliente
 * Para usar en componentes React con 'use client'
 */
export async function getTenantContextClient(): Promise<TenantContext> {
  const supabase = createClientComponentClient()
  
  // Obtener usuario autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Usuario no autenticado')
  }

  // Obtener perfil del usuario con organization_id y workshop_id (opcional)
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('workshop_id, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !userProfile) {
    throw new Error('Perfil de usuario no encontrado')
  }

  const userWorkshopId = (userProfile as any).workshop_id as string | null
  const organizationId = (userProfile as any).organization_id as string | null

  // ✅ organization_id es requerido
  if (!organizationId) {
    throw new Error('No se pudo obtener organization_id del perfil')
  }

  let workshopId: string | null = null

  // ✅ workshop_id es opcional - intentar obtenerlo si existe
  if (userWorkshopId) {
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('id, organization_id')
      .eq('id', userWorkshopId)
      .single()

    if (!workshopError && workshop) {
      // Validar que el workshop pertenece a la organización
      if (workshop.organization_id === organizationId) {
        workshopId = workshop.id
      } else {
        console.warn('[getTenantContextClient] ⚠️ Workshop no pertenece a la organización')
      }
    }
  }

  // ✅ Si no hay workshop_id, buscar si la org tiene un solo workshop
  if (!workshopId) {
    const { data: workshops } = await supabase
      .from('workshops')
      .select('id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    // Si solo hay 1 workshop, usar ese automáticamente
    if (workshops && workshops.length === 1) {
      workshopId = workshops[0].id
      console.log('[getTenantContextClient] ✅ Un solo workshop encontrado, usando automáticamente')
    } else {
      console.log('[getTenantContextClient] ⚠️ Múltiples workshops o ninguno, workshopId será null')
    }
  }

  return {
    organizationId,
    workshopId: workshopId || organizationId, // Fallback a organizationId si no hay workshop
    userId: user.id
  }
}

/**
 * API simplificada para cliente
 * Obtiene solo organization_id y workshop_id
 */
export async function getSimpleTenantContextClient(): Promise<{ organizationId: string; workshopId: string }> {
  const context = await getTenantContextClient()
  return {
    organizationId: context.organizationId,
    workshopId: context.workshopId
  }
}

/**
 * Hook personalizado para obtener contexto del tenant en React
 * Uso:
 * const { context, loading, error } = useTenantContext()
 */
export function useTenantContext() {
  const [context, setContext] = React.useState<TenantContext | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadContext() {
      try {
        const tenantContext = await getTenantContextClient()
        setContext(tenantContext)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    loadContext()
  }, [])

  return { context, loading, error }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Valida que un organization_id sea válido
 */
export function validateOrganizationId(organizationId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(organizationId)
}

/**
 * Valida que un workshop_id sea válido
 */
export function validateWorkshopId(workshopId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(workshopId)
}

/**
 * Crea un filtro de consulta para organization_id
 */
export function createOrganizationFilter(organizationId?: string) {
  return organizationId ? { organization_id: organizationId } : {}
}

/**
 * Crea un filtro de consulta para workshop_id
 */
export function createWorkshopFilter(workshopId?: string) {
  return workshopId ? { workshop_id: workshopId } : {}
}

/**
 * Combina filtros de organization y workshop
 */
export function createTenantFilters(organizationId?: string, workshopId?: string) {
  return {
    ...createOrganizationFilter(organizationId),
    ...createWorkshopFilter(workshopId)
  }
}

// =====================================================
// ERROR HANDLING
// =====================================================

export class TenantError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'TenantError'
  }
}

export class OrganizationNotFoundError extends TenantError {
  constructor(organizationId: string) {
    super(`Organización no encontrada: ${organizationId}`, 'ORGANIZATION_NOT_FOUND')
  }
}

export class WorkshopNotFoundError extends TenantError {
  constructor(workshopId: string) {
    super(`Workshop no encontrado: ${workshopId}`, 'WORKSHOP_NOT_FOUND')
  }
}

export class UnauthorizedTenantError extends TenantError {
  constructor() {
    super('No autorizado para acceder a este tenant', 'UNAUTHORIZED_TENANT')
  }
}
