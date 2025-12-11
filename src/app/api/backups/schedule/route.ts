import { NextRequest, NextResponse } from 'next/server'
import { getBackupSchedule, setBackupSchedule } from '@/lib/database/queries/backups'
import { scheduleBackups } from '@/lib/backup/service'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/backups/schedule - Obtener programación de backups
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

    const schedule = await getBackupSchedule(organizationId)

    return NextResponse.json({
      data: schedule,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/backups/schedule:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/backups/schedule - Configurar programación de backups
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

    const result = await scheduleBackups(organizationId)

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

    console.error('Error in POST /api/backups/schedule:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

