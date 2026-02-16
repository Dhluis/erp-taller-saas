/**
 * POST /api/work-orders/[id]/images/delete
 * Elimina imágenes de Supabase Storage y actualiza work_orders.images (JSONB).
 * Body: { paths: string[] } - paths tal como están en work_orders.images[].path
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

const BUCKET = 'work-order-images'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 })
    }

    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('work_orders')
      .select('id, images, organization_id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: fetchError?.message || 'Orden no encontrada o no autorizada' },
        { status: fetchError ? 500 : 404 }
      )
    }

    const body = await request.json()
    const pathsToDelete: string[] = Array.isArray(body.paths) ? body.paths : []
    if (pathsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array "paths" con al menos un path' },
        { status: 400 }
      )
    }

    const currentImages = (order.images as { path: string; url?: string; uploadedAt?: string }[]) || []
    const pathSet = new Set(pathsToDelete)
    const remainingImages = currentImages.filter((img) => !pathSet.has(img.path))
    const toRemoveFromStorage: string[] = []

    for (const path of pathsToDelete) {
      if (!path || typeof path !== 'string') continue
      // path en BD puede ser "work-order-images/orgId/orderId/file.jpg"
      const storagePath = path.startsWith(`${BUCKET}/`)
        ? path.slice((BUCKET + '/').length)
        : path
      toRemoveFromStorage.push(storagePath)
    }

    if (toRemoveFromStorage.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove(toRemoveFromStorage)

      if (removeError) {
        console.warn('[images/delete] Error eliminando de Storage:', removeError)
        // Continuar para actualizar BD aunque falle Storage (evitar inconsistencia de UI)
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('work_orders')
      .update({
        images: remainingImages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId)

    if (updateError) {
      console.error('[images/delete] Error actualizando work_orders:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: pathsToDelete.length,
      remaining: remainingImages.length,
    })
  } catch (err: any) {
    console.error('[images/delete] Exception:', err)
    return NextResponse.json(
      { error: err?.message || 'Error al eliminar imágenes' },
      { status: 500 }
    )
  }
}
