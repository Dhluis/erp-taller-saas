/**
 * API Route Migrada para Nota de Venta Individual
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
  getInvoiceByIdWithLogging,
  updateInvoiceWithLogging,
  deleteInvoiceWithLogging,
} from '@/lib/api/invoice-by-id-migration';

// =====================================================
// GET - Obtener nota de venta por ID (MIGRADO)
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return getInvoiceByIdWithLogging(request, { params });
}

// =====================================================
// PUT - Actualizar nota de venta (MIGRADO)
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return updateInvoiceWithLogging(request, { params });
}

// =====================================================
// DELETE - Eliminar nota de venta (MIGRADO)
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return deleteInvoiceWithLogging(request, { params });
}

/**
 * INSTRUCCIONES DE MIGRACIÓN:
 * 
 * 1. Reemplaza tu código original con este archivo
 * 2. Cambia las importaciones de:
 *    - '@/lib/database/queries/billing' 
 *    - A: '@/lib/api/invoice-by-id-migration'
 * 
 * 3. Reemplaza las funciones:
 *    - getInvoiceById() → getInvoiceByIdWithLogging()
 *    - updateInvoice() → updateInvoiceWithLogging()
 *    - deleteInvoice() → deleteInvoiceWithLogging()
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


















