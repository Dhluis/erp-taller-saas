import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldBackups } from '@/lib/database/queries/backups'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// POST /api/backups/cleanup - Limpiar backups antiguos
export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { error: 'No autorizado: organización no encontrada' },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const { searchParams } = new URL(request.url)
    const keepCount = parseInt(searchParams.get('keep_count') || '30')

    const result = await cleanupOldBackups(organizationId, keepCount)

    return NextResponse.json({
      data: result,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/backups/cleanup:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

