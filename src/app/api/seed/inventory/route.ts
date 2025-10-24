// ✅ CORRECTO: API route para ejecutar seed de datos de inventario

import { NextRequest, NextResponse } from 'next/server';
import { seedInventoryData, cleanInventoryData } from '@/lib/database/seed-inventory';
import { handleAPIError, createErrorResponse } from '@/lib/errors/APIError';

/**
 * @swagger
 * /api/seed/inventory:
 *   post:
 *     summary: Ejecuta el seed de datos de inventario
 *     description: Inserta datos de prueba de inventario en la base de datos para desarrollo
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Seed de inventario ejecutado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       500:
 *         description: Error del servidor
 */
export async function POST(request: NextRequest) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        {
          success: false,
          error: 'Seed de inventario solo disponible en modo desarrollo',
          code: 'NOT_DEVELOPMENT',
          statusCode: 403
        },
        { status: 403 }
      );
    }
    
    console.log('🌱 Iniciando seed de datos de inventario...');
    
    // Ejecutar seed de inventario
    await seedInventoryData();
    
    return NextResponse.json({
      success: true,
      message: 'Datos de inventario insertados correctamente',
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        items: {
          products: 13,
          services: 5,
          categories: 12,
          movements: 13
        }
      }
    });
    
  } catch (error) {
    const apiError = handleAPIError(error, 'POST /api/seed/inventory');
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}

/**
 * @swagger
 * /api/seed/inventory:
 *   delete:
 *     summary: Limpia los datos de inventario
 *     description: Elimina todos los datos de inventario de prueba de la base de datos
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Datos de inventario limpiados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Error del servidor
 */
export async function DELETE(request: NextRequest) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        {
          success: false,
          error: 'Limpieza de inventario solo disponible en modo desarrollo',
          code: 'NOT_DEVELOPMENT',
          statusCode: 403
        },
        { status: 403 }
      );
    }
    
    console.log('🧹 Limpiando datos de inventario...');
    
    // Limpiar datos de inventario
    await cleanInventoryData();
    
    return NextResponse.json({
      success: true,
      message: 'Datos de inventario eliminados correctamente',
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    const apiError = handleAPIError(error, 'DELETE /api/seed/inventory');
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}
















