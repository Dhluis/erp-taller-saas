import { NextRequest, NextResponse } from 'next/server';
import {
  getAllVehicles,
  createVehicle,
  searchVehicles,
} from '@/lib/database/queries/vehicles';

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Obtener todos los vehículos o buscar
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Lista de vehículos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 count:
 *                   type: number
 *   post:
 *     summary: Crear un nuevo vehículo
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVehicleData'
 *     responses:
 *       201:
 *         description: Vehículo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
// GET: Obtener todos los vehículos o buscar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let vehicles;
    
    if (search) {
      vehicles = await searchVehicles(search);
    } else {
      vehicles = await getAllVehicles();
    }

    return NextResponse.json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener vehículos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo vehículo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validaciones básicas
    if (!body.customer_id || !body.brand || !body.model) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: customer_id, brand, model',
        },
        { status: 400 }
      );
    }

    // Validar año si está presente
    if (body.year) {
      const currentYear = new Date().getFullYear();
      if (body.year < 1900 || body.year > currentYear + 1) {
        return NextResponse.json(
          {
            success: false,
            error: `El año debe estar entre 1900 y ${currentYear + 1}`,
          },
          { status: 400 }
        );
      }
    }

    const vehicle = await createVehicle(body);

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        message: 'Vehículo creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear vehículo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}