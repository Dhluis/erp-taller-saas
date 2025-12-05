/**
 * Validador específico para clientes
 * Asegura que todas las operaciones con clientes respeten multi-tenancy
 */

import { getOrganizationId } from '@/lib/auth/organization-server';
import { createServerClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export interface CustomerValidationResult {
  valid: boolean;
  error?: string;
  organizationId?: string;
}

/**
 * Valida que un cliente pertenece a la organización del usuario
 */
export async function validateCustomerAccess(
  request: NextRequest,
  customerId: string
): Promise<CustomerValidationResult> {
  try {
    // Obtener organization_id del usuario
    const userOrganizationId = await getOrganizationId(request);
    const supabase = await createServerClient();

    // Obtener cliente y su organization_id
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, organization_id')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return {
        valid: false,
        error: 'Cliente no encontrado'
      };
    }

    if (!customer.organization_id) {
      return {
        valid: false,
        error: 'Cliente sin organización asignada'
      };
    }

    if (customer.organization_id !== userOrganizationId) {
      return {
        valid: false,
        error: `Acceso denegado: El cliente pertenece a otra organización`
      };
    }

    return {
      valid: true,
      organizationId: customer.organization_id
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Error validando acceso al cliente: ${error.message}`
    };
  }
}

/**
 * Valida que el organization_id proporcionado es correcto
 */
export async function validateCustomerOrganizationId(
  request: NextRequest,
  providedOrganizationId: string | null | undefined
): Promise<CustomerValidationResult> {
  try {
    const userOrganizationId = await getOrganizationId(request);

    if (!providedOrganizationId) {
      return {
        valid: false,
        error: 'organization_id es requerido'
      };
    }

    if (providedOrganizationId !== userOrganizationId) {
      return {
        valid: false,
        error: `No se puede crear/actualizar cliente en otra organización. Tu organización: ${userOrganizationId}`
      };
    }

    return {
      valid: true,
      organizationId: userOrganizationId
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Error validando organización: ${error.message}`
    };
  }
}

