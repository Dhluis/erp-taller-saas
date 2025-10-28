/**
 * API Route Migrada para Pagos por Nota de Venta
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
  getPaymentsByInvoiceWithLogging,
} from '@/lib/api/payments-by-invoice-migration';

// =====================================================
// GET - Obtener pagos por nota de venta (MIGRADO)
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  // Usar la función migrada que mantiene compatibilidad
  return getPaymentsByInvoiceWithLogging(request, { params });
}

/**
 * INSTRUCCIONES DE MIGRACIÓN:
 * 
 * 1. Reemplaza tu código original con este archivo
 * 2. Cambia las importaciones de:
 *    - '@/lib/database/queries/billing' 
 *    - A: '@/lib/api/payments-by-invoice-migration'
 * 
 * 3. Reemplaza las funciones:
 *    - getPaymentsByInvoice() → getPaymentsByInvoiceWithLogging()
 * 
 * 4. Mantén la misma estructura de request/response
 * 
 * BENEFICIOS DE LA MIGRACIÓN:
 * ✅ Mismo comportamiento que tu código original
 * ✅ Logging automático y detallado
 * ✅ Validaciones de negocio adicionales
 * ✅ Verificación de existencia de nota de venta
 * ✅ Manejo robusto de errores
 * ✅ Compatibilidad total con el frontend existente
 */
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)

