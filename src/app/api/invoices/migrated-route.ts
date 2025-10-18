/**
 * API Route Migrada para Notas de Venta
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
  getInvoicesWithLogging,
  createInvoiceWithLogging,
} from '@/lib/api/invoices-migration';

// =====================================================
// GET - Listar notas de venta, buscar o estadísticas (MIGRADO)
// =====================================================
export async function GET(request: NextRequest) {
  // Usar la función migrada que mantiene compatibilidad
  return getInvoicesWithLogging(request);
}

// =====================================================
// POST - Crear nueva nota de venta (MIGRADO)
// =====================================================
export async function POST(request: NextRequest) {
  // Usar la función migrada que mantiene compatibilidad
  return createInvoiceWithLogging(request);
}

/**
 * INSTRUCCIONES DE MIGRACIÓN:
 * 
 * 1. Reemplaza tu código original con este archivo
 * 2. Cambia las importaciones de:
 *    - '@/lib/database/queries/billing' 
 *    - A: '@/lib/api/invoices-migration'
 * 
 * 3. Reemplaza las funciones:
 *    - getAllInvoices() → getInvoicesWithLogging()
 *    - createInvoice() → createInvoiceWithLogging()
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

