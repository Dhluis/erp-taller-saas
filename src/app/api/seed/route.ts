// ✅ CORRECTO: API route para ejecutar seed de datos de prueba

import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase, cleanSeedData } from '@/lib/database/seed-simple';
import { handleAPIError, createErrorResponse } from '@/lib/errors/APIError';

/**
 * @swagger
 * /api/seed:
 *   post:
 *     summary: Ejecuta el seed de datos de prueba
 *     description: Inserta datos de prueba en la base de datos para desarrollo
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Seed ejecutado correctamente
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
          error: 'Seed solo disponible en modo desarrollo',
          code: 'NOT_DEVELOPMENT',
          statusCode: 403
        },
        { status: 403 }
      );
    }
    
    console.log('🌱 Iniciando seed de datos de prueba...');
    
    // Ejecutar seed
    await seedDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Datos de prueba insertados correctamente',
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    const apiError = handleAPIError(error, 'POST /api/seed');
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}

/**
 * @swagger
 * /api/seed:
 *   delete:
 *     summary: Limpia los datos de prueba
 *     description: Elimina todos los datos de prueba de la base de datos
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Datos limpiados correctamente
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
          error: 'Limpieza solo disponible en modo desarrollo',
          code: 'NOT_DEVELOPMENT',
          statusCode: 403
        },
        { status: 403 }
      );
    }
    
    console.log('🧹 Limpiando datos de prueba...');
    
    // Limpiar datos
    await cleanSeedData();
    
    return NextResponse.json({
      success: true,
      message: 'Datos de prueba eliminados correctamente',
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    const apiError = handleAPIError(error, 'DELETE /api/seed');
    return NextResponse.json(
      createErrorResponse(apiError),
      { status: apiError.statusCode }
    );
  }
}