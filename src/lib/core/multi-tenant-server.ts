/**
 * Multi-Tenant Helper Functions - SERVER SIDE
 * Solo para usar en Server Components y API Routes
 * 
 * NO importar en componentes con 'use client'
 */

import { createClient, createClientFromRequest } from '@/lib/supabase/server'

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
// SERVER-SIDE FUNCTIONS (API Routes)
// =====================================================

/**
 * Obtiene el contexto completo del tenant (organization + workshop + user)
 * Para usar SOLO en API routes (server-side)
 * 
 * @param request - Opcional: NextRequest para obtener cookies del request
 */
export async function getTenantContext(request?: any): Promise<TenantContext> {
  try {
    // Si hay un request, usar las cookies del request (para API routes)
    // Si no, usar cookies() de next/headers (para Server Components)
    const supabase = request 
      ? createClientFromRequest(request)
      : await createClient()
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('[getTenantContext] ❌ Error obteniendo usuario:', {
        message: userError.message,
        status: userError.status,
        name: userError.name
      })
      throw new Error('Usuario no autenticado')
    }
    
    if (!user) {
      console.warn('[getTenantContext] ⚠️ No se encontró usuario autenticado')
      throw new Error('Usuario no autenticado')
    }
    
    console.log('[getTenantContext] ✅ Usuario obtenido:', user.id)

    // Obtener perfil del usuario con workshop_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('workshop_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      console.error('[getTenantContext] ❌ Error obteniendo perfil:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      })
      throw new Error('Perfil de usuario no encontrado')
    }
    
    if (!userProfile) {
      console.warn('[getTenantContext] ⚠️ Perfil de usuario no encontrado para user:', user.id)
      throw new Error('Perfil de usuario no encontrado')
    }
    
    console.log('[getTenantContext] ✅ Perfil obtenido, workshop_id:', userProfile.workshop_id)

    // Obtener workshop y organization_id
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('id, organization_id')
      .eq('id', userProfile.workshop_id)
      .single()

    if (workshopError) {
      console.error('[getTenantContext] ❌ Error obteniendo workshop:', {
        message: workshopError.message,
        code: workshopError.code,
        workshopId: userProfile.workshop_id
      })
      throw new Error('Workshop no encontrado')
    }
    
    if (!workshop) {
      console.warn('[getTenantContext] ⚠️ Workshop no encontrado con id:', userProfile.workshop_id)
      throw new Error('Workshop no encontrado')
    }
    
    console.log('[getTenantContext] ✅ Workshop obtenido:', {
      workshopId: workshop.id,
      organizationId: workshop.organization_id
    })

    return {
      organizationId: workshop.organization_id,
      workshopId: workshop.id,
      userId: user.id
    }
  } catch (error: any) {
    // Si el error ya tiene un mensaje, re-lanzarlo
    if (error.message && (error.message.includes('no autenticado') || 
                          error.message.includes('no encontrado'))) {
      throw error
    }
    // Otros errores
    console.error('[getTenantContext] ❌ Error inesperado:', error)
    throw new Error('Error obteniendo contexto del tenant: ' + error.message)
  }
}

/**
 * Obtiene solo el organization_id del usuario autenticado
 */
export async function getOrganizationId(): Promise<string> {
  const context = await getTenantContext()
  return context.organizationId
}

/**
 * Obtiene solo el workshop_id del usuario autenticado
 */
export async function getWorkshopId(): Promise<string> {
  const context = await getTenantContext()
  return context.workshopId
}

/**
 * Obtiene información completa de la organización
 */
export async function getOrganizationInfo(organizationId?: string): Promise<OrganizationInfo> {
  const supabase = await createClient()
  const orgId = organizationId || await getOrganizationId()

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('id, name, address, phone, email')
    .eq('id', orgId)
    .single()

  if (error || !organization) {
    throw new Error('Organización no encontrada')
  }

  return organization
}

/**
 * Obtiene información completa del workshop
 */
export async function getWorkshopInfo(workshopId?: string): Promise<WorkshopInfo> {
  const supabase = await createClient()
  const wsId = workshopId || await getWorkshopId()

  const { data: workshop, error } = await supabase
    .from('workshops')
    .select('id, name, organization_id, email, phone, address')
    .eq('id', wsId)
    .single()

  if (error || !workshop) {
    throw new Error('Workshop no encontrado')
  }

  return workshop
}

/**
 * API simplificada para obtener solo organization_id y workshop_id
 */
export async function getSimpleTenantContext(): Promise<{ organizationId: string; workshopId: string }> {
  const context = await getTenantContext()
  return {
    organizationId: context.organizationId,
    workshopId: context.workshopId
  }
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


