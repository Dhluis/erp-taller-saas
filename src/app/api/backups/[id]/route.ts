import { NextRequest, NextResponse } from 'next/server'
import { getBackupById, deleteBackup } from '@/lib/database/queries/backups'
import { restoreBackup, verifyBackupIntegrity } from '@/lib/backup/service'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/backups/[id] - Obtener backup
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'backups', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const backup = await getBackupById(params.id)

    return NextResponse.json({
      data: backup,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/backups/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/backups/[id] - Eliminar backup
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'backups', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const backup = await deleteBackup(params.id)

    return NextResponse.json({
      data: backup,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in DELETE /api/backups/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

