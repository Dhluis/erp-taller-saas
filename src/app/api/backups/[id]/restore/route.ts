import { NextRequest, NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup/service'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// POST /api/backups/[id]/restore - Restaurar backup
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await restoreBackup(params.id, organizationId)

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

    console.error('Error in POST /api/backups/[id]/restore:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

