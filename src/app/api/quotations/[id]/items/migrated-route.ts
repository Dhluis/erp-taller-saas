/**
 * API Route Migrada para Items de Cotizaciones
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
  getQuotationItemsWithLogging,
  createQuotationItemWithLogging,
} from '@/lib/api/quotations-items-migration';

// =====================================================
// GET - Obtener items de cotización (MIGRADO)
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return getQuotationItemsWithLogging(request, { params });
}

// =====================================================
// POST - Crear item de cotización (MIGRADO)
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return createQuotationItemWithLogging(request, { params });
}

/**
 * INSTRUCCIONES DE MIGRACIÓN:
 * 
 * 1. Reemplaza tu código original con este archivo
 * 2. Cambia las importaciones de:
 *    - '@/lib/database/queries/billing' 
 *    - A: '@/lib/api/quotations-items-migration'
 * 
 * 3. Reemplaza las funciones:
 *    - getQuotationItems() → getQuotationItemsWithLogging()
 *    - createQuotationItem() → createQuotationItemWithLogging()
 * 
 * 4. Mantén la misma estructura de request/response
 * 
 * BENEFICIOS DE LA MIGRACIÓN:
 * ✅ Mismo comportamiento que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Recálculo automático de totales
 * ✅ Manejo robusto de errores
 * ✅ Compatibilidad total con el frontend existente
 */

