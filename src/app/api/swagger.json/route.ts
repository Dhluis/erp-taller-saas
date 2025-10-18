import { NextResponse } from 'next/server'
import { generateSwaggerSpec } from '@/lib/swagger/generator'

// GET /api/swagger.json - Obtener definición OpenAPI generada automáticamente
export async function GET() {
  try {
    const spec = generateSwaggerSpec()
    return NextResponse.json(spec)
  } catch (error: any) {
    console.error('Error generating Swagger JSON:', error)
    return NextResponse.json(
      { error: 'Error generating API documentation' },
      { status: 500 }
    )
  }
}
