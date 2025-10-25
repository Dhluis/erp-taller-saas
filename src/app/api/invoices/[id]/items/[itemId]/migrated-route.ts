/**
 * API Route Migrada para Item Individual de Nota de Venta
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
  updateInvoiceItemWithLogging,
  deleteInvoiceItemWithLogging,
} from '@/lib/api/invoice-item-by-id-migration';

// =====================================================
// PUT - Actualizar item (MIGRADO)
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return updateInvoiceItemWithLogging(request, { params });
}

// =====================================================
// DELETE - Eliminar item (MIGRADO)
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return deleteInvoiceItemWithLogging(request, { params });
}

/**
 * INSTRUCCIONES DE MIGRACIÓN:
 * 
 * 1. Reemplaza tu código original con este archivo
 * 2. Cambia las importaciones de:
 *    - '@/lib/database/queries/billing' 
 *    - A: '@/lib/api/invoice-item-by-id-migration'
 * 
 * 3. Reemplaza las funciones:
 *    - updateInvoiceItem() → updateInvoiceItemWithLogging()
 *    - deleteInvoiceItem() → deleteInvoiceItemWithLogging()
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

















