import { NextRequest, NextResponse } from 'next/server'
import { getBackupStats } from '@/lib/database/queries/backups'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/backups/stats - Obtener estadísticas de backups
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'backups', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id

    const stats = await getBackupStats(organizationId)

    return NextResponse.json({
      data: stats,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/backups/stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

