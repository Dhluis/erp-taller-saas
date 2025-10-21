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

    // Subir archivo
    console.log('📤 Iniciando upload a Supabase Storage...')
    console.log('🔄 [uploadWorkOrderImage] Bucket: work-order-images')
    console.log('🔄 [uploadWorkOrderImage] Archivo:', file.name, 'Tamaño:', file.size, 'bytes')
    console.log('⏱️ Timeout configurado: 60 segundos')
    
    // Crear una promesa con timeout
    const uploadPromise = supabase.storage
      .from('work-order-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: La subida tardó más de 60 segundos. Verifica que el bucket "work-order-images" existe en Supabase.')), 60000)
    )

    console.log('🔄 [uploadWorkOrderImage] Esperando respuesta de Supabase...')
    const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any

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
