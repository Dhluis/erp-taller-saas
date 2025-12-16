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
    let body
    try {
      body = await request.json()
      console.log('🔵 [API] Body recibido:', JSON.stringify(body).substring(0, 200))
    } catch (parseError: any) {
      console.error('❌ [API] Error parseando JSON:', parseError)
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }
    
    // ✅ Soportar tanto una imagen como múltiples imágenes
    let imagesToAdd: any[]
    if (body.images && Array.isArray(body.images)) {
      imagesToAdd = body.images
    } else if (body.path || body.url) {
      // Es un objeto de imagen individual
      imagesToAdd = [body]
    } else {
      console.error('❌ [API] Formato de datos inválido:', body)
      return NextResponse.json(
        { error: 'Formato de datos inválido. Se espera { images: [...] } o un objeto de imagen' },
        { status: 400 }
      )
    }
    
    console.log('🔵 [API] Imágenes recibidas:', imagesToAdd.length)
    
    // Validar que todas las imágenes tengan la estructura correcta
    const validImages = imagesToAdd.filter(img => {
      const isValid = img && (img.path || img.url) && img.uploadedAt
      if (!isValid) {
        console.warn('⚠️ [API] Imagen inválida ignorada:', img)
      }
      return isValid
    })
    
    if (validImages.length === 0) {
      console.error('❌ [API] No hay imágenes válidas después de validación')
      return NextResponse.json(
        { error: 'No se recibieron imágenes válidas. Cada imagen debe tener: path (o url) y uploadedAt' },
        { status: 400 }
      )
    }
    
    if (validImages.length < imagesToAdd.length) {
      console.warn(`⚠️ [API] ${imagesToAdd.length - validImages.length} imagen(es) inválida(s) fueron ignoradas`)
    }
    
    imagesToAdd = validImages
    
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

// DELETE: Eliminar imagen de orden de trabajo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔴 [API] DELETE Request recibida para work-orders')
  console.log('🔴 [API] Order ID:', params.id)
  
  try {
    const orderId = params.id
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [API DELETE] Error de autenticación:', authError)
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
      console.error('❌ [API DELETE] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    
    // Obtener imagePath del body o query params
    const { searchParams } = new URL(request.url);
    let imagePath = searchParams.get('imagePath');
    
    if (!imagePath) {
      try {
        const body = await request.json();
        imagePath = body.imagePath || body.path;
      } catch {
        // Si no hay body, intentar obtener del query
      }
    }

    if (!imagePath) {
      return NextResponse.json(
        { error: 'Se requiere imagePath para eliminar la imagen' },
        { status: 400 }
      )
    }

    console.log('🔴 [API DELETE] Image path:', imagePath)
    
    // ✅ Validar que la orden pertenezca a la organización del usuario
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('work_orders')
      .select('images, organization_id')
      .eq('id', orderId)
      .eq('organization_id', organizationId) // ✅ Validar multi-tenancy
      .single()
    
    if (fetchError || !order) {
      console.error('❌ [API DELETE] Error fetch o orden no encontrada:', fetchError)
      return NextResponse.json(
        { error: fetchError?.message || 'Orden no encontrada o no autorizada' },
        { status: fetchError ? 500 : 404 }
      )
    }
    
    console.log('🔴 [API DELETE] Orden obtenida, eliminando imagen...')
    
    // Filtrar la imagen del array
    const currentImages = order?.images || []
    const updatedImages = currentImages.filter((img: any) => img.path !== imagePath)
    
    // Actualizar orden
    const { error: updateError } = await supabaseAdmin
      .from('work_orders')
      .update({
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId) // ✅ Validar multi-tenancy en update
    
    if (updateError) {
      console.error('❌ [API DELETE] Error update:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // ✅ Eliminar del storage (opcional, no crítico si falla)
    try {
      // Extraer el path correcto del storage
      const storagePath = imagePath.replace('work-order-images/', '').replace(/^.*\//, '')
      const fullPath = imagePath.includes('/') ? imagePath : `${orderId}/${storagePath}`
      
      const { error: storageError } = await supabaseAdmin.storage
        .from('work-order-images')
        .remove([fullPath])
      
      if (storageError) {
        console.warn('⚠️ [API DELETE] Error eliminando del storage (no crítico):', storageError)
        // No fallar si el storage falla, ya se eliminó de la BD
      } else {
        console.log('✅ [API DELETE] Imagen eliminada del storage')
      }
    } catch (storageErr) {
      console.warn('⚠️ [API DELETE] Error en storage (no crítico):', storageErr)
    }
    
    console.log('✅ [API DELETE] Imagen eliminada exitosamente')
    return NextResponse.json({ 
      success: true,
      message: 'Imagen eliminada exitosamente'
    })
    
  } catch (error: any) {
    console.error('❌ [API DELETE] Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar imagen' },
      { status: 500 }
    )
  }
}
