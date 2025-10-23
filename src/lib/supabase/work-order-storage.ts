import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type ImageCategory = 'reception' | 'damage' | 'process' | 'completed' | 'other'

export interface WorkOrderImage {
  url: string
  path: string
  uploadedAt: string
  uploadedBy: string
  category: ImageCategory
  description?: string
  size: number
  name: string
  orderStatus: string
}

/**
 * Función alternativa de upload usando fetch directo
 */
async function uploadWithDirectFetch(
  file: File,
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return { success: false, error: 'Missing Supabase credentials' }
    }
    
    // Obtener el token de la sesión actual
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔑 [DirectFetch] Usando token de:', session ? 'sesión' : 'anon key')
    console.log('🔧 [DirectFetch] Usando fetch directo...')
    
    const url = `${SUPABASE_URL}/storage/v1/object/work-order-images/${fileName}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': file.type,
      },
      body: file
    })
    
    console.log('🔧 [DirectFetch] Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔧 [DirectFetch] Error:', errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
    
    const data = await response.json()
    console.log('🔧 [DirectFetch] Success:', data)
    
    return { success: true, path: fileName }
    
  } catch (error: any) {
    console.error('🔧 [DirectFetch] Exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Subir imagen de orden de trabajo
 */
export async function uploadWorkOrderImage(
  file: File,
  orderId: string,
  category: ImageCategory,
  description?: string,
  userId?: string,
  orderStatus?: string
): Promise<{ success: boolean; data?: WorkOrderImage; error?: string }> {
  try {
    console.log('🔄 [uploadWorkOrderImage] Iniciando subida...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      orderId,
      category,
      userId
    })

    // Verificar configuración de Supabase
    console.log('🔍 [uploadWorkOrderImage] Verificando configuración de Supabase...')
    console.log('🔍 [uploadWorkOrderImage] Supabase client:', !!supabase)
    console.log('🔍 [uploadWorkOrderImage] Supabase storage:', !!supabase.storage)

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      console.error('❌ [uploadWorkOrderImage] Tipo de archivo inválido:', file.type)
      return { success: false, error: 'El archivo debe ser una imagen' }
    }

    // Validar tamaño (10MB máximo para fotos de alta calidad)
    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ [uploadWorkOrderImage] Archivo muy grande:', file.size)
      return { success: false, error: 'La imagen no debe superar 10MB' }
    }

    // Generar nombre único con carpeta por orden
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const fileName = `${orderId}/${category}-${timestamp}-${random}.${fileExt}`
    
    console.log('✅ [uploadWorkOrderImage] Nombre de archivo generado:', fileName)

    try {
      console.log('🔹 [DEBUG] Paso 1: Nombre generado exitosamente')
      console.log('🔹 [DEBUG] Paso 2: Preparando para verificar autenticación...')
      console.log('🔹 [DEBUG] Tipo de archivo:', typeof file, file instanceof File)
      console.log('🔹 [DEBUG] Tamaño del archivo:', file.size)

      // Aquí debería estar el código de auth check
      console.log('🔹 [DEBUG] Paso 3: A punto de llamar supabase.auth.getSession()')

      // Verificar autenticación
      console.log('🔹 [DEBUG] Paso 4: Ejecutando getSession...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔐 [Auth Check] Sesión:', session ? 'ACTIVA' : 'NO ACTIVA')
      console.log('🔐 [Auth Check] User ID:', session?.user?.id)
      console.log('🔐 [Auth Check] Email:', session?.user?.email)
      console.log('🔐 [Auth Check] Token presente:', !!session?.access_token)
      console.log('🔐 [Auth Check] Error de sesión:', sessionError)

      if (!session) {
        console.error('❌ [Auth] No hay sesión activa - el usuario NO está logueado')
        return { success: false, error: 'Usuario no autenticado. Por favor inicia sesión.' }
      }

      // Intentar con fetch directo primero
      console.log('🔧 Intentando upload con fetch directo...')
      const directResult = await uploadWithDirectFetch(file, fileName)

      if (!directResult.success) {
        console.error('❌ Upload directo falló:', directResult.error)
        return { success: false, error: directResult.error }
      }

      console.log('✅ Upload directo exitoso')
      const uploadData = { path: fileName }
      const uploadError = null

      console.log('🏁 [DEBUG] Continuando después del upload...')

      console.log('✅ Upload completado exitosamente')
      console.log('🔄 [uploadWorkOrderImage] Subida completada. Data:', uploadData, 'Error:', uploadError)

      if (uploadError) {
        console.error('❌ Error en upload:', uploadError)
        console.error('❌ Detalles:', uploadError.message)
        console.error('Detalles del error:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        })
        
        // Mensajes de error más específicos
        let errorMessage = uploadError.message
        if (uploadError.message.includes('not found')) {
          errorMessage = 'El bucket de almacenamiento no existe. Contacta al administrador.'
        } else if (uploadError.message.includes('policy')) {
          errorMessage = 'No tienes permisos para subir archivos.'
        } else if (uploadError.message.includes('size')) {
          errorMessage = 'El archivo es demasiado grande.'
        }
        
        return { success: false, error: errorMessage }
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('work-order-images')
        .getPublicUrl(fileName)

      console.log('✅ [uploadWorkOrderImage] URL pública generada:', urlData.publicUrl)

      const imageData: WorkOrderImage = {
        url: urlData.publicUrl,
        path: `work-order-images/${fileName}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId || 'unknown',
        category,
        description,
        size: file.size,
        name: file.name,
        orderStatus: orderStatus || 'unknown'
      }

      console.log('✅ [uploadWorkOrderImage] Imagen subida exitosamente:', imageData)
      return { success: true, data: imageData }

    } catch (error: any) {
      console.error('🔥 [CRITICAL ERROR] Excepción no capturada:', error)
      console.error('🔥 Stack:', error.stack)
      console.error('🔥 Mensaje:', error.message)
      console.error('🔥 Tipo:', error.constructor.name)
      return { success: false, error: `Error crítico: ${error.message}` }
    }
  } catch (error: any) {
    console.error('❌ Error en upload:', error)
    console.error('❌ Detalles:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Eliminar imagen de orden de trabajo
 */
export async function deleteWorkOrderImage(
  imagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extraer el path correcto
    const path = imagePath.replace('work-order-images/', '')

    const { error } = await supabase.storage
      .from('work-order-images')
      .remove([path])

    if (error) {
      console.error('Error eliminando imagen:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Agregar imagen a orden en la BD
 */
export async function addImageToWorkOrder(
  orderId: string,
  imageData: WorkOrderImage
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener imágenes actuales
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('images')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const currentImages = order.images || []
    const updatedImages = [...currentImages, imageData]

    // Actualizar orden
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Eliminar imagen de orden en la BD
 */
export async function removeImageFromWorkOrder(
  orderId: string,
  imagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener imágenes actuales
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('images')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const currentImages = order.images || []
    const updatedImages = currentImages.filter(
      (img: WorkOrderImage) => img.path !== imagePath
    )

    // Actualizar orden
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Eliminar del storage
    await deleteWorkOrderImage(imagePath)

    return { success: true }
  } catch (error: any) {
    console.error('Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualizar descripción de una imagen
 */
export async function updateImageDescription(
  orderId: string,
  imagePath: string,
  newDescription: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener imágenes actuales
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('images')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const currentImages = order.images || []
    const updatedImages = currentImages.map((img: WorkOrderImage) =>
      img.path === imagePath
        ? { ...img, description: newDescription }
        : img
    )

    // Actualizar orden
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error:', error)
    return { success: false, error: error.message }
  }
}
