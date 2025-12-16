/**
 * Configuración por Organización
 * Obtiene configuración específica de cada organización desde company_settings
 * con fallback a variables de entorno globales
 */

import { getCompanySettings } from '@/lib/supabase/company-settings'
import { ERP_CONFIG } from './env'

export interface OrganizationConfig {
  currency: string
  taxRate: number
  timezone?: string
  language?: string
  lowStockThreshold: number
  criticalStockThreshold: number
  quotationValidityDays: number
  invoicePaymentDays: number
  estimatedHoursDefault: number
}

/**
 * Obtener configuración de una organización
 * Prioridad: company_settings > variables de entorno > defaults
 */
export async function getOrganizationConfig(
  organizationId: string
): Promise<OrganizationConfig> {
  try {
    // Intentar obtener configuración de la organización
    const companySettings = await getCompanySettings(organizationId)

    if (companySettings) {
      return {
        currency: companySettings.currency || ERP_CONFIG.defaultCurrency,
        taxRate: companySettings.tax_rate || ERP_CONFIG.defaultTaxRate,
        timezone: undefined, // TODO: Agregar timezone a company_settings si es necesario
        language: undefined, // TODO: Agregar language a company_settings si es necesario
        lowStockThreshold: ERP_CONFIG.lowStockThreshold,
        criticalStockThreshold: ERP_CONFIG.criticalStockThreshold,
        quotationValidityDays: ERP_CONFIG.quotationValidityDays,
        invoicePaymentDays: ERP_CONFIG.invoicePaymentDays,
        estimatedHoursDefault: ERP_CONFIG.estimatedHoursDefault,
      }
    }
  } catch (error) {
    console.warn(
      `[OrganizationConfig] No se pudo obtener configuración de organización ${organizationId}:`,
      error
    )
  }

  // Fallback a configuración global
  return {
    currency: ERP_CONFIG.defaultCurrency,
    taxRate: ERP_CONFIG.defaultTaxRate,
    timezone: undefined,
    language: undefined,
    lowStockThreshold: ERP_CONFIG.lowStockThreshold,
    criticalStockThreshold: ERP_CONFIG.criticalStockThreshold,
    quotationValidityDays: ERP_CONFIG.quotationValidityDays,
    invoicePaymentDays: ERP_CONFIG.invoicePaymentDays,
    estimatedHoursDefault: ERP_CONFIG.estimatedHoursDefault,
  }
}

/**
 * Obtener configuración de moneda de una organización
 */
export async function getOrganizationCurrency(
  organizationId: string
): Promise<string> {
  const config = await getOrganizationConfig(organizationId)
  return config.currency
}

/**
 * Obtener tasa de impuestos de una organización
 */
export async function getOrganizationTaxRate(
  organizationId: string
): Promise<number> {
  const config = await getOrganizationConfig(organizationId)
  return config.taxRate
}

/**
 * Obtener configuración de inventario de una organización
 */
export async function getOrganizationInventoryConfig(
  organizationId: string
): Promise<{
  lowStockThreshold: number
  criticalStockThreshold: number
}> {
  const config = await getOrganizationConfig(organizationId)
  return {
    lowStockThreshold: config.lowStockThreshold,
    criticalStockThreshold: config.criticalStockThreshold,
  }
}

