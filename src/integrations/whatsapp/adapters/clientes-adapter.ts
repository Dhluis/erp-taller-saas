// src/integrations/whatsapp/adapters/clientes-adapter.ts

/**
 * 🔌 Adapter para Clientes
 * 
 * Conecta el bot de WhatsApp con el sistema de clientes existente.
 * NO modifica el código original, solo lo importa y usa.
 * 
 * Funcionalidad:
 * - Buscar clientes por teléfono
 * - Crear clientes desde conversaciones de WhatsApp
 * - Obtener información de clientes para el bot
 */

import { 
  createCustomer, 
  getAllCustomers,
  getCustomerById 
} from '@/lib/database/queries/customers';
import type { Customer } from '@/lib/database/queries/customers';
import type { 
  BotCustomer, 
  AdapterResponse 
} from '../types';

export interface CreateCustomerFromBotParams {
  organization_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  source?: 'whatsapp_bot'; // Siempre será esto
}

/**
 * Busca un cliente por número de teléfono
 * Útil para verificar si el cliente ya existe antes de crear uno nuevo
 */
export async function findCustomerByPhone(
  phone: string,
  organizationId: string
): Promise<AdapterResponse<BotCustomer | null>> {
  try {
    // Normalizar teléfono (remover espacios, guiones, etc.)
    const normalizedPhone = normalizePhoneNumber(phone);

    // Usar cliente de Supabase del lado del cliente
    const { getSupabaseClient } = await import('../utils/supabase-helpers');
    const supabase = getSupabaseClient();

    // Buscar por teléfono
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    // Si no existe, retornar null (no es error)
    if (!data) {
      return {
        success: true,
        data: null
      };
    }

    // Mapear a BotCustomer
    const botCustomer: BotCustomer = {
      id: data.id,
      organization_id: data.organization_id,
      name: data.name,
      phone: data.phone || normalizedPhone,
      email: data.email || undefined,
      created_at: new Date(data.created_at),
      source: 'whatsapp_bot' // Asumimos que vino del bot si lo estamos buscando
    };

    return {
      success: true,
      data: botCustomer
    };

  } catch (error) {
    console.error('[ClientesAdapter] Error buscando cliente por teléfono:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene o crea un cliente desde el bot de WhatsApp
 * Estrategia: Buscar primero, crear solo si no existe
 */
export async function getOrCreateCustomerFromBot(
  params: CreateCustomerFromBotParams
): Promise<AdapterResponse<BotCustomer>> {
  try {
    // 1. Validar datos requeridos
    if (!params.organization_id) {
      return {
        success: false,
        error: 'organization_id es requerido'
      };
    }

    if (!params.name || !params.phone) {
      return {
        success: false,
        error: 'name y phone son requeridos'
      };
    }

    // 2. Normalizar teléfono
    const normalizedPhone = normalizePhoneNumber(params.phone);

    // 3. Buscar si ya existe
    const existingResult = await findCustomerByPhone(
      normalizedPhone,
      params.organization_id
    );

    if (!existingResult.success) {
      return existingResult;
    }

    // Si ya existe, retornarlo
    if (existingResult.data) {
      return {
        success: true,
        data: existingResult.data,
        metadata: {
          created: false,
          found_existing: true
        }
      };
    }

    // 4. No existe, crear nuevo cliente usando la función existente
    const customer = await createCustomer({
      organization_id: params.organization_id,
      name: params.name,
      phone: normalizedPhone,
      email: params.email,
      address: params.address,
      notes: params.notes 
        ? `${params.notes}\n\n📱 Cliente contactó por WhatsApp`
        : '📱 Cliente contactó por WhatsApp'
    });

    // 5. Guardar metadata adicional de WhatsApp
    await saveWhatsAppCustomerMetadata({
      customer_id: customer.id,
      organization_id: params.organization_id,
      source: 'whatsapp_bot',
      first_contact_phone: normalizedPhone,
      created_at: new Date()
    });

    // 6. Mapear a BotCustomer
    const botCustomer: BotCustomer = {
      id: customer.id,
      organization_id: customer.organization_id,
      name: customer.name,
      phone: customer.phone || normalizedPhone,
      email: customer.email || undefined,
      created_at: new Date(customer.created_at),
      source: 'whatsapp_bot'
    };

    return {
      success: true,
      data: botCustomer,
      metadata: {
        created: true,
        found_existing: false
      }
    };

  } catch (error) {
    console.error('[ClientesAdapter] Error obteniendo/creando cliente:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Crea un cliente nuevo desde el bot (sin buscar antes)
 * Usar solo cuando estés seguro que no existe
 */
export async function createCustomerFromBot(
  params: CreateCustomerFromBotParams
): Promise<AdapterResponse<BotCustomer>> {
  try {
    // Validaciones
    if (!params.organization_id || !params.name || !params.phone) {
      return {
        success: false,
        error: 'organization_id, name y phone son requeridos'
      };
    }

    const normalizedPhone = normalizePhoneNumber(params.phone);

    // Llamar a la función EXISTENTE sin modificarla
    const customer = await createCustomer({
      organization_id: params.organization_id,
      name: params.name,
      phone: normalizedPhone,
      email: params.email,
      address: params.address,
      notes: params.notes 
        ? `${params.notes}\n\n📱 Cliente contactó por WhatsApp`
        : '📱 Cliente contactó por WhatsApp'
    });

    // Guardar metadata WhatsApp
    await saveWhatsAppCustomerMetadata({
      customer_id: customer.id,
      organization_id: params.organization_id,
      source: 'whatsapp_bot',
      first_contact_phone: normalizedPhone,
      created_at: new Date()
    });

    const botCustomer: BotCustomer = {
      id: customer.id,
      organization_id: customer.organization_id,
      name: customer.name,
      phone: customer.phone || normalizedPhone,
      email: customer.email || undefined,
      created_at: new Date(customer.created_at),
      source: 'whatsapp_bot'
    };

    return {
      success: true,
      data: botCustomer
    };

  } catch (error) {
    console.error('[ClientesAdapter] Error creando cliente:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene información de un cliente para el contexto del bot
 */
export async function getCustomerForBot(
  customerId: string,
  organizationId: string
): Promise<AdapterResponse<BotCustomer>> {
  try {
    // Usar la función existente
    const customer = await getCustomerById(customerId);

    // Validar que pertenece a la organización correcta
    if (customer.organization_id !== organizationId) {
      return {
        success: false,
        error: 'Cliente no pertenece a esta organización'
      };
    }

    const botCustomer: BotCustomer = {
      id: customer.id,
      organization_id: customer.organization_id,
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || undefined,
      created_at: new Date(customer.created_at),
      source: 'whatsapp_bot'
    };

    return {
      success: true,
      data: botCustomer
    };

  } catch (error) {
    console.error('[ClientesAdapter] Error obteniendo cliente:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene historial de órdenes de un cliente (para contexto del bot)
 */
export async function getCustomerOrderHistory(
  customerId: string,
  organizationId: string
): Promise<AdapterResponse<any[]>> {
  try {
    const { getSupabaseClient } = await import('../utils/supabase-helpers');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('work_orders')
      .select('id, status, created_at, total_amount')
      .eq('customer_id', customerId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5); // Solo últimas 5 órdenes

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('[ClientesAdapter] Error obteniendo historial:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// ============================================
// 🛠️ FUNCIONES AUXILIARES
// ============================================

/**
 * Normaliza número de teléfono para consistencia
 * Ejemplos:
 * - "449 123 4567" -> "+524491234567"
 * - "+52 1 449 123 4567" -> "+524491234567"
 * - "4491234567" -> "+524491234567"
 */
function normalizePhoneNumber(phone: string): string {
  // Remover espacios, guiones, paréntesis
  let normalized = phone.replace(/[\s\-\(\)]/g, '');

  // Si ya tiene +52, mantenerlo
  if (normalized.startsWith('+52')) {
    // Remover el "1" después de +52 si existe (celular)
    normalized = normalized.replace(/^\+521/, '+52');
    return normalized;
  }

  // Si empieza con 52 (sin +)
  if (normalized.startsWith('52') && normalized.length >= 12) {
    return `+${normalized}`;
  }

  // Si es un número local de 10 dígitos (ej: 4491234567)
  if (normalized.length === 10) {
    return `+52${normalized}`;
  }

  // Si tiene 11 dígitos y empieza con 1 (formato antiguo)
  if (normalized.length === 11 && normalized.startsWith('1')) {
    return `+52${normalized.slice(1)}`;
  }

  // Retornar como está si no coincide con ningún patrón
  return normalized;
}

/**
 * Guarda metadata adicional específica de clientes de WhatsApp
 */
async function saveWhatsAppCustomerMetadata(metadata: {
  customer_id: string;
  organization_id: string;
  source: string;
  first_contact_phone: string;
  created_at: Date;
}) {
  try {
    const { getSupabaseClient } = await import('../utils/supabase-helpers');
    const supabase = getSupabaseClient();

    // Tabla que crearemos después en migración
    await supabase
      .from('whatsapp_customer_metadata')
      .insert({
        customer_id: metadata.customer_id,
        organization_id: metadata.organization_id,
        source: metadata.source,
        first_contact_phone: metadata.first_contact_phone,
        created_at: metadata.created_at.toISOString()
      });

  } catch (error) {
    // No fallar si la tabla no existe aún
    console.warn('[ClientesAdapter] No se pudo guardar metadata WhatsApp:', error);
  }
}

// ============================================
// 📤 EXPORTAR INTERFAZ PÚBLICA
// ============================================

export const clientesAdapter = {
  findByPhone: findCustomerByPhone,
  getOrCreate: getOrCreateCustomerFromBot,
  create: createCustomerFromBot,
  getForBot: getCustomerForBot,
  getOrderHistory: getCustomerOrderHistory
};


