/**
 * Validador de Organización
 * Funciones para validar organization_id en múltiples capas
 */

import { getOrganizationId } from '@/lib/auth/organization-server';
import type { NextRequest } from 'next/server';

/**
 * Valida que un organization_id pertenece al usuario actual
 * Para usar en API routes
 */
export async function validateOrganizationAccess(
  request: NextRequest,
  recordOrganizationId: string | null | undefined
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Obtener organization_id del usuario actual
    const userOrganizationId = await getOrganizationId(request);

    // Si el registro no tiene organization_id, es un problema
    if (!recordOrganizationId) {
      return {
        valid: false,
        error: 'El registro no tiene organization_id asignado'
      };
    }

    // Verificar que el registro pertenece a la organización del usuario
    if (recordOrganizationId !== userOrganizationId) {
      return {
        valid: false,
        error: `Acceso denegado: El registro pertenece a otra organización (${recordOrganizationId})`
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: `Error validando acceso: ${error.message}`
    };
  }
}

/**
 * Valida que un organization_id existe en la base de datos
 */
export async function validateOrganizationExists(
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  const { createServerClient } = await import('@/lib/supabase/server');
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    return {
      valid: false,
      error: `La organización ${organizationId} no existe`
    };
  }

  return { valid: true };
}

/**
 * Valida que el usuario tiene organization_id asignado
 */
export async function validateUserHasOrganization(
  request: NextRequest
): Promise<{ valid: boolean; organizationId?: string; error?: string }> {
  try {
    const organizationId = await getOrganizationId(request);
    return { valid: true, organizationId };
  } catch (error: any) {
    return {
      valid: false,
      error: `Usuario sin organización asignada: ${error.message}`
    };
  }
}

/**
 * Middleware helper para validar organization_id en API routes
 */
export async function requireOrganizationAccess(
  request: NextRequest,
  recordOrganizationId: string | null | undefined
): Promise<string> {
  const validation = await validateOrganizationAccess(request, recordOrganizationId);
  
  if (!validation.valid) {
    throw new Error(validation.error || 'Acceso denegado');
  }

  return await getOrganizationId(request);
}

