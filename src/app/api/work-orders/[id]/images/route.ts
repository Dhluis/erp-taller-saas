import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// 🚀 DEPLOY READY - Image upload API route
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔵 [API] Request recibida para work-orders')
  console.log('🔵 [API] Order ID:', params.id)
  
  try {
    const orderId = params.id
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [API] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [API] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    
    console.log('🔵 [API] Parseando body...')
    const body = await request.json()
    
    // ✅ Soportar tanto una imagen como múltiples imágenes
    const imagesToAdd = body.images ? body.images : [body]
    console.log('🔵 [API] Imágenes recibidas:', imagesToAdd.length)
    
    if (!Array.isArray(imagesToAdd) || imagesToAdd.length === 0) {
      return NextResponse.json(
        { error: 'No se recibieron imágenes válidas' },
        { status: 400 }
      )
    }
    
    console.log('🔵 [API] Obteniendo orden...')
    // ✅ Validar que la orden pertenezca a la organización del usuario
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('work_orders')
      .select('images, organization_id')
      .eq('id', orderId)
      .eq('organization_id', organizationId) // ✅ Validar multi-tenancy
      .single()
    
    if (fetchError || !order) {
      console.error('❌ [API] Error fetch o orden no encontrada:', fetchError)
      return NextResponse.json(
        { error: fetchError?.message || 'Orden no encontrada o no autorizada' },
        { status: fetchError ? 500 : 404 }
      )
    }
    
    console.log('🔵 [API] Orden obtenida, actualizando...')
    
    const currentImages = order?.images || []
    const updatedImages = [...currentImages, ...imagesToAdd]
    
    const { error: updateError } = await supabaseAdmin
      .from('work_orders')
      .update({
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId) // ✅ Validar multi-tenancy en update
    
    if (updateError) {
      console.error('❌ [API] Error update:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    console.log(`✅ [API] ${imagesToAdd.length} imagen${imagesToAdd.length > 1 ? 'es' : ''} agregada${imagesToAdd.length > 1 ? 's' : ''} exitosamente`)
    return NextResponse.json({ 
      success: true,
      count: imagesToAdd.length
    })
    
  } catch (error: any) {
    console.error('❌ [API] Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar imagen' },
      { status: 500 }
    )
  }
}
