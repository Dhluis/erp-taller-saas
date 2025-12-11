import { NextRequest, NextResponse } from 'next/server'
import { getAllBackups, getBackupStats } from '@/lib/database/queries/backups'
import { createBackup } from '@/lib/backup/service'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/backups - Listar backups
export async function GET(request: NextRequest) {
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
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await getAllBackups(organizationId, {
      status,
      date_from: dateFrom,
      date_to: dateTo,
      page,
      limit
    })

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/backups:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/backups - Crear backup
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

    const backup = await createBackup(organizationId)

    return NextResponse.json({
      data: backup,
      error: null
    }, { status: 201 })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/backups:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

