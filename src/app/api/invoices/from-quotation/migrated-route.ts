/**
 * API Route Migrada para Crear Nota de Venta desde Cotización
 * 
 * Esta es la versión migrada de tu código original que:
 * - Mantiene la misma interfaz y respuestas
 * - Agrega logging robusto
 * - Incluye validaciones de negocio
 * - Usa el sistema centralizado
 * 
 * Para migrar tu código original, simplemente reemplaza las importaciones
 * y usa las funciones de migración
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createInvoiceFromQuotationWithLogging,
} from '@/lib/api/invoice-from-quotation-migration';

// =====================================================
// POST - Crear nota de venta desde cotización (MIGRADO)
// =====================================================
export async function POST(request: NextRequest) {
  // Usar la función migrada que mantiene compatibilidad
  return createInvoiceFromQuotationWithLogging(request);
}

/**
 * INSTRUCCIONES DE MIGRACIÓN:
 * 
 * 1. Reemplaza tu código original con este archivo
 * 2. Cambia las importaciones de:
 *    - '@/lib/database/queries/billing' 
 *    - A: '@/lib/api/invoice-from-quotation-migration'
 * 
 * 3. Reemplaza las funciones:
 *    - createInvoiceFromQuotation() → createInvoiceFromQuotationWithLogging()
 * 
 * 4. Mantén la misma estructura de request/response
 * 
 * BENEFICIOS DE LA MIGRACIÓN:
 * ✅ Mismo comportamiento que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Verificación de existencia de cotización
 * ✅ Validación de estado de cotización
 * ✅ Verificación de expiración de cotización
 * ✅ Manejo robusto de errores
 * ✅ Compatibilidad total con el frontend existente
 */
















