/**
 * Servicio de Configuraciones de Empresa
 * Funciones para manejar la configuración de la empresa
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { z } from 'zod'
import { CompanySetting, CompanySettingInsert, CompanySettingUpdate } from '@/types/supabase-simple'

// Esquema de validación para la configuración de la empresa
const companySettingsSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  company_name: z.string().min(1, 'El nombre de la empresa no puede estar vacío'),
  tax_id: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Debe ser un email válido').optional().nullable(),
  logo_url: z.string().url('Debe ser una URL válida para el logo').optional().nullable(),
  currency: z.string().length(3, 'La moneda debe ser un código de 3 letras (ej. USD)').default('MXN'),
  base_currency: z.string().length(3).optional().nullable(),
  tax_rate: z.number().min(0, 'La tasa de impuestos no puede ser negativa').max(100, 'La tasa de impuestos no puede ser mayor a 100').default(16.00),
  working_hours: z.record(z.string(), z.string()).default({}), // Ejemplo: { "monday": "9-5", "tuesday": "9-5" }
  invoice_terms: z.string().optional().nullable(),
  appointment_defaults: z.record(z.string(), z.any()).default({}), // Ejemplo: { "default_duration": 60, "default_status": "scheduled" }
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type CompanySettings = z.infer<typeof companySettingsSchema>
export type CreateCompanySettings = Omit<CompanySettings, 'id' | 'created_at' | 'updated_at'>
export type UpdateCompanySettings = Partial<Omit<CompanySettings, 'created_at' | 'updated_at' | 'organization_id'>>

/**
 * Obtener configuración de la empresa
 */
export async function getCompanySettings(organizationId: string): Promise<CompanySettings | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('company_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(`Failed to fetch company settings: ${error.message}`)
      }

      return data
    },
    {
      operation: 'getCompanySettings',
      table: 'company_settings'
    }
  )
}

/**
 * Actualizar configuración de la empresa
 */
export async function updateCompanySettings(organizationId: string, settingsData: UpdateCompanySettings): Promise<CompanySettings> {
  return executeWithErrorHandling(
    async () => {
      const validatedData = companySettingsSchema.partial().omit({ created_at: true, updated_at: true, organization_id: true }).parse(settingsData)
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('company_settings')
        .update(validatedData)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update company settings: ${error.message}`)
      }

      return data
    },
    {
      operation: 'updateCompanySettings',
      table: 'company_settings'
    }
  )
}

/**
 * Crear configuración de la empresa
 */
export async function createCompanySettings(settingsData: CreateCompanySettings): Promise<CompanySettings> {
  return executeWithErrorHandling(
    async () => {
      const validatedData = companySettingsSchema.omit({ id: true, created_at: true, updated_at: true }).parse(settingsData)
      const client = getSupabaseClient()

      const { data, error } = await client
        .from('company_settings')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create company settings: ${error.message}`)
      }

      return data
    },
    {
      operation: 'createCompanySettings',
      table: 'company_settings'
    }
  )
}

/**
 * Inicializar configuración de la empresa (si no existe)
 */
export async function initializeCompanySettings(organizationId: string, initialData: Partial<CompanySettings>): Promise<CompanySettings> {
  return executeWithErrorHandling(
    async () => {
      // Verificar si ya existe
      const existingSettings = await getCompanySettings(organizationId)
      if (existingSettings) {
        return existingSettings
      }

      // Crear nueva configuración
      const defaultSettings: CreateCompanySettings = {
        organization_id: organizationId,
        company_name: initialData.company_name || 'Mi Empresa',
        currency: initialData.currency || 'MXN',
        tax_rate: initialData.tax_rate || 16.00,
        working_hours: initialData.working_hours || {},
        appointment_defaults: initialData.appointment_defaults || {},
        email: initialData.email || null,
        phone: initialData.phone || null,
        address: initialData.address || null,
        tax_id: initialData.tax_id || null,
        logo_url: initialData.logo_url || null,
        invoice_terms: initialData.invoice_terms || null,
      }

      return await createCompanySettings(defaultSettings)
    },
    {
      operation: 'initializeCompanySettings',
      table: 'company_settings'
    }
  )
}

/**
 * Obtener configuración por defecto para una nueva empresa
 */
export function getDefaultCompanySettings(organizationId: string): CreateCompanySettings {
  return {
    organization_id: organizationId,
    company_name: 'Mi Empresa',
    currency: 'MXN',
    tax_rate: 16.00,
    working_hours: {
      monday: '9:00-18:00',
      tuesday: '9:00-18:00',
      wednesday: '9:00-18:00',
      thursday: '9:00-18:00',
      friday: '9:00-18:00',
      saturday: '9:00-14:00',
      sunday: 'closed'
    },
    appointment_defaults: {
      default_duration: 60,
      default_status: 'scheduled',
      advance_booking_days: 30
    },
    invoice_terms: 'Pago a 30 días',
    email: null,
    phone: null,
    address: null,
    tax_id: null,
    logo_url: null,
  }
}