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
  /** UUID del workshop del usuario, o null si no tiene sucursal asignada. */
  workshopId: string | null
  userId: string
  /** 'ADMIN' | 'ASESOR' | 'MECANICO' — evita que cada ruta repita su propia query de rol. */
  role: string
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
 * Devuelve `null` (no lanza excepción) cuando la petición no puede asociarse
 * a un tenant por una razón esperada: sin sesión, sin perfil, sin
 * organización. Todas las rutas del proyecto ya están escritas asumiendo
 * este contrato (`if (!tenantContext) return 401`) — antes esta función
 * lanzaba una excepción en esos casos, así que ese chequeo nunca se
 * ejecutaba y el error terminaba como un 500 genérico con el mensaje de la
 * excepción (ej. "Usuario no autenticado") en vez de un 401 limpio. Solo se
 * lanza una excepción real para errores verdaderamente inesperados
 * (red, base de datos), donde un 500 sí es la respuesta correcta.
 *
 * @param request - Opcional: NextRequest para obtener cookies del request
 */
export async function getTenantContext(request?: any): Promise<TenantContext | null> {
  try {
    // Intentar primero con request si está disponible (para API routes)
    // Si falla o no hay request, usar cookies() de next/headers (para Server Components)
    // Intentar inicializar cliente
    let supabase;
    try {
      if (request) {
        supabase = createClientFromRequest(request);
      } else {
        supabase = await createClient();
      }
    } catch (requestError: any) {
      console.warn('[getTenantContext] ⚠️ Error inicializando cliente:', requestError.message);
      supabase = await createClient();
    }
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.warn('[getTenantContext] ⚠️ Usuario no autenticado:', {
        message: userError.message,
        status: userError.status,
        name: userError.name
      })
      return null
    }

    if (!user) {
      console.warn('[getTenantContext] ⚠️ No se encontró usuario autenticado')
      return null
    }
    
    console.log('[getTenantContext] ✅ Usuario obtenido:', user.id)

    // ✅ Obtener perfil para identificar organización
    // Intentar usar Service Role (bypass RLS) primero para evitar bloqueos en nuevos registros
    const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
    const serviceClient = getSupabaseServiceClient();
    
    // Si no hay cliente administrativo (llave faltante), usar el cliente estándar (de usuario)
    // Nota: Esto activará RLS, pero es mejor que fallar con 500.
    const supabaseAdmin = serviceClient || supabase;

    // Intento 1: Tabla 'users' (Principal)
    let { data: userProfile, error: profileError } = await (supabaseAdmin as any)
      .from('users')
      .select('workshop_id, organization_id, role')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle()

    // Intento 2: Tabla 'system_users' (Fallback)
    if (profileError || !userProfile) {
      console.log(`🔍 [getTenantContext] Buscando en 'system_users' para ${user.id}...`);
      const { data: systemData } = await (supabaseAdmin as any)
        .from('system_users')
        .select('organization_id, role')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email || 'unset'}`)
        .maybeSingle();

      if (systemData) {
        userProfile = {
          organization_id: systemData.organization_id,
          workshop_id: null,
          role: systemData.role || 'ADMIN'
        };
        profileError = null;
      }
    }

    if (profileError || !userProfile) {
      console.warn('[getTenantContext] ⚠️ No se encontró perfil:', profileError);
      return null
    }
    
    console.log('[getTenantContext] ✅ Perfil robusto obtenido:', {
      workshop_id: userProfile.workshop_id,
      organization_id: userProfile.organization_id
    })

    // Usar organization_id directamente del perfil del usuario (más confiable)
    // Si no está en el perfil, intentar obtenerlo del workshop como fallback
    let organizationId = userProfile.organization_id;
    let workshopId = userProfile.workshop_id;

    // Si no hay organization_id en el perfil, intentar obtenerlo del workshop
    if (!organizationId && workshopId) {
      console.log('[getTenantContext] ⚠️ No hay organization_id en perfil, obteniendo desde workshop...');
      const { data: workshop, error: workshopError } = await supabase
        .from('workshops')
        .select('id, organization_id')
        .eq('id', workshopId)
        .single()

      if (workshopError || !workshop) {
        console.warn('[getTenantContext] ⚠️ Workshop no encontrado o error al obtenerlo:', {
          message: workshopError?.message,
          code: workshopError?.code,
          workshopId: workshopId
        })
        // ✅ No lanzar error - el workshop_id puede ser inválido o el workshop puede haber sido eliminado
        // Limpiar workshopId inválido
        workshopId = null;
        console.log('[getTenantContext] ⚠️ workshopId limpiado debido a workshop no encontrado');
      } else {
        organizationId = workshop.organization_id;
        console.log('[getTenantContext] ✅ OrganizationId obtenido desde workshop:', organizationId);
      }
    }

    if (!organizationId) {
      console.warn('[getTenantContext] ⚠️ No se pudo obtener organizationId');
      return null
    }

    // ⚠️ Antes se usaba organizationId como valor de workshopId cuando el usuario no
    // tenía sucursal asignada. Eso nunca coincide con un workshop_id real de negocio
    // (es un UUID de organización, no de workshop), así que cualquier `.eq('workshop_id', ...)`
    // que confiara en ese valor no encontraba nada. Ahora se devuelve null, honesto.
    workshopId = workshopId || null;

    console.log('[getTenantContext] ✅ Contexto final:', {
      organizationId,
      workshopId,
      userId: user.id,
      role: userProfile.role
    })

    return {
      organizationId,
      workshopId,
      userId: user.id,
      role: userProfile.role
    }
  } catch (error: any) {
    // Solo llega acá un error verdaderamente inesperado (red, base de datos) —
    // los casos esperados (sin sesión, sin perfil, sin organización) ya
    // retornan null arriba. Acá sí corresponde un 500 en el caller.
    console.error('[getTenantContext] ❌ Error inesperado:', error)
    throw new Error('Error obteniendo contexto del tenant: ' + error.message)
  }
}

/**
 * Obtiene solo el organization_id del usuario autenticado
 */
export async function getOrganizationId(): Promise<string> {
  const context = await getTenantContext()
  if (!context) throw new Error('Usuario no autenticado')
  return context.organizationId
}

/**
 * Obtiene solo el workshop_id del usuario autenticado
 */
export async function getWorkshopId(): Promise<string | null> {
  const context = await getTenantContext()
  if (!context) throw new Error('Usuario no autenticado')
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

  if (!wsId) {
    throw new Error('Workshop no encontrado')
  }

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
export async function getSimpleTenantContext(): Promise<{ organizationId: string; workshopId: string | null }> {
  const context = await getTenantContext()
  if (!context) throw new Error('Usuario no autenticado')
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


