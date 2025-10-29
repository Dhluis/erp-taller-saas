// src/lib/supabase/work-order-documents.ts
import { createClient } from '@/lib/supabase/client'

export interface WorkOrderDocument {
  id: string
  name: string
  url: string
  type: string
  category: 'invoice' | 'quotation' | 'receipt' | 'contract' | 'warranty' | 'photo' | 'report' | 'other'
  size: number
  uploaded_by: string
  uploaded_at: string
}

const BUCKET_NAME = 'work-order-documents'

/**
 * Subir documento a Supabase Storage
 */
export async function uploadDocument(
  workOrderId: string,
  file: File,
  category: WorkOrderDocument['category'],
  userId: string
): Promise<WorkOrderDocument> {
  const supabase = createClient()
  
  console.log('📤 [uploadDocument] Iniciando subida:', {
    workOrderId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    category
  })

  // Validar tamaño (max 50MB)
  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo es demasiado grande. Máximo 50MB')
  }

  // Validar tipo de archivo
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    console.error('❌ Tipo de archivo no permitido:', file.type)
    throw new Error(`Tipo de archivo no permitido: ${file.type}`)
  }

  // Generar nombre único
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `${workOrderId}/${timestamp}_${sanitizedName}`

  console.log('📁 Ruta del archivo:', fileName)

  // Subir archivo
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    console.error('❌ Error uploading document:', uploadError)
    throw new Error(`Error al subir archivo: ${uploadError.message}`)
  }

  console.log('✅ Archivo subido a storage:', uploadData)

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  console.log('🔗 URL pública generada:', urlData.publicUrl)

  const document: WorkOrderDocument = {
    id: crypto.randomUUID(),
    name: file.name,
    url: urlData.publicUrl,
    type: file.type,
    category,
    size: file.size,
    uploaded_by: userId,
    uploaded_at: new Date().toISOString()
  }

  // Agregar documento al array en work_orders
  const { data: workOrder, error: fetchError } = await supabase
    .from('work_orders')
    .select('documents')
    .eq('id', workOrderId)
    .single()

  if (fetchError) {
    console.error('❌ Error obteniendo work order:', fetchError)
    throw new Error(`Error al obtener orden: ${fetchError.message}`)
  }

  const currentDocuments = (workOrder.documents as WorkOrderDocument[]) || []
  const updatedDocuments = [...currentDocuments, document]

  console.log('📝 Actualizando documentos en BD:', {
    documentosActuales: currentDocuments.length,
    documentosNuevos: updatedDocuments.length
  })

  const { error: updateError } = await supabase
    .from('work_orders')
    .update({ documents: updatedDocuments })
    .eq('id', workOrderId)

  if (updateError) {
    console.error('❌ Error actualizando work order:', updateError)
    throw new Error(`Error al guardar documento: ${updateError.message}`)
  }

  console.log('✅ Documento guardado exitosamente')

  return document
}

/**
 * Eliminar documento
 */
export async function deleteDocument(
  workOrderId: string,
  documentId: string
): Promise<void> {
  const supabase = createClient()

  console.log('🗑️ [deleteDocument] Eliminando documento:', {
    workOrderId,
    documentId
  })

  // Obtener documento actual
  const { data: workOrder, error: fetchError } = await supabase
    .from('work_orders')
    .select('documents')
    .eq('id', workOrderId)
    .single()

  if (fetchError) {
    console.error('❌ Error obteniendo work order:', fetchError)
    throw new Error(`Error al obtener orden: ${fetchError.message}`)
  }

  const documents = (workOrder.documents as WorkOrderDocument[]) || []
  const document = documents.find(d => d.id === documentId)

  if (!document) {
    console.error('❌ Documento no encontrado:', documentId)
    throw new Error('Documento no encontrado')
  }

  console.log('📄 Documento encontrado:', document.name)

  // Extraer path del storage desde la URL
  const urlParts = document.url.split(`${BUCKET_NAME}/`)
  const filePath = urlParts[1]

  console.log('📁 Eliminando del storage:', filePath)

  // Eliminar archivo del storage
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (deleteError) {
    console.error('❌ Error deleting file from storage:', deleteError)
    // No lanzar error aquí, continuar con actualización de BD
  }

  // Actualizar array de documentos
  const updatedDocuments = documents.filter(d => d.id !== documentId)

  console.log('📝 Actualizando BD:', {
    documentosAntes: documents.length,
    documentosDespués: updatedDocuments.length
  })

  const { error: updateError } = await supabase
    .from('work_orders')
    .update({ documents: updatedDocuments })
    .eq('id', workOrderId)

  if (updateError) {
    console.error('❌ Error actualizando work order:', updateError)
    throw new Error(`Error al eliminar documento: ${updateError.message}`)
  }

  console.log('✅ Documento eliminado exitosamente')
}

/**
 * Obtener documentos de una orden
 */
export async function getDocuments(workOrderId: string): Promise<WorkOrderDocument[]> {
  const supabase = createClient()

  console.log('📂 [getDocuments] Obteniendo documentos de:', workOrderId)

  const { data, error } = await supabase
    .from('work_orders')
    .select('documents')
    .eq('id', workOrderId)
    .single()

  if (error) {
    console.error('❌ Error obteniendo documentos:', error)
    throw new Error(`Error al obtener documentos: ${error.message}`)
  }

  const documents = (data.documents as WorkOrderDocument[]) || []
  console.log('✅ Documentos obtenidos:', documents.length)

  return documents
}

/**
 * Formatear tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Obtener icono según tipo de archivo
 */
export function getFileIcon(type: string): string {
  if (type.includes('pdf')) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('word')) return '📝'
  if (type.includes('excel') || type.includes('sheet')) return '📊'
  if (type.includes('text')) return '📃'
  return '📎'
}

/**
 * Obtener color de badge según categoría
 */
export function getCategoryColor(category: WorkOrderDocument['category']): string {
  const colors = {
    invoice: 'bg-green-500/10 text-green-500 border-green-500/20',
    quotation: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    receipt: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    contract: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    warranty: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    photo: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    report: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
  return colors[category] || colors.other
}

/**
 * Obtener label en español según categoría
 */
export function getCategoryLabel(category: WorkOrderDocument['category']): string {
  const labels = {
    invoice: 'Factura',
    quotation: 'Cotización',
    receipt: 'Recibo',
    contract: 'Contrato',
    warranty: 'Garantía',
    photo: 'Foto',
    report: 'Reporte',
    other: 'Otro'
  }
  return labels[category] || 'Otro'
}

/**
 * Descargar documento
 */
export function downloadDocument(url: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}










