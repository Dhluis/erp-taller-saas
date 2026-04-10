'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  X, 
  Image as ImageIcon,
  Loader2,
  ZoomIn,
  Edit,
  Camera,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import {
  uploadWorkOrderImage,
  WorkOrderImage,
  ImageCategory
} from '@/lib/supabase/work-order-storage'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/lib/context/SessionContext'
import Image from 'next/image'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useImagePagination } from '@/hooks/useImagePagination'

interface WorkOrderImageManagerProps {
  orderId: string
  images: WorkOrderImage[]
  onImagesChange: (images: WorkOrderImage[], options?: { skipRefetch?: boolean }) => void
  currentStatus: string
  userId?: string
  maxImages?: number
}

const CATEGORY_LABELS: Record<ImageCategory, { label: string; color: string }> = {
  reception: { label: 'Recepción', color: 'bg-blue-500' },
  damage: { label: 'Daño', color: 'bg-red-500' },
  process: { label: 'Proceso', color: 'bg-yellow-500' },
  completed: { label: 'Completado', color: 'bg-green-500' }
}

/** Evita "Cannot read properties of undefined (reading 'color')" — categorías desconocidas → Recepción */
function getCategoryInfo(category: string | undefined | null): { label: string; color: string } {
  if (!category) return CATEGORY_LABELS.reception
  const info = CATEGORY_LABELS[category as ImageCategory]
  return info ?? CATEGORY_LABELS.reception
}

/**
 * Comprime imagen y genera thumbnail
 * ✅ OPTIMIZADO PARA MÓVIL: Reduce tamaño más agresivamente
 * Reduce tamaño de 4-12MB a ~200-500KB (imagen completa) en móvil
 * Genera thumbnail de 200x200px (~10-20KB)
 */
async function compressImage(file: File): Promise<{
  full: File
  thumbnail: File
}> {
  return new Promise((resolve, reject) => {
    // ✅ DETECTAR MÓVIL para optimizar más agresivamente
    const isMobile = typeof window !== 'undefined' && 
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
       window.innerWidth < 768)
    
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.src = e.target?.result as string
      
      img.onload = () => {
        const originalWidth = img.width
        const originalHeight = img.height
        
        // ============================================
        // 1. GENERAR IMAGEN COMPLETA (optimizado para móvil)
        // ============================================
        let fullWidth = originalWidth
        let fullHeight = originalHeight
        // ✅ MÓVIL: 1200px máximo, DESKTOP: 1920px máximo
        const MAX_SIZE = isMobile ? 1200 : 1920
        
        if (fullWidth > fullHeight && fullWidth > MAX_SIZE) {
          fullHeight = Math.round((fullHeight * MAX_SIZE) / fullWidth)
          fullWidth = MAX_SIZE
        } else if (fullHeight > MAX_SIZE) {
          fullWidth = Math.round((fullWidth * MAX_SIZE) / fullHeight)
          fullHeight = MAX_SIZE
        }
        
        const fullCanvas = document.createElement('canvas')
        fullCanvas.width = fullWidth
        fullCanvas.height = fullHeight
        const fullCtx = fullCanvas.getContext('2d')
        fullCtx?.drawImage(img, 0, 0, fullWidth, fullHeight)
        
        // ============================================
        // 2. GENERAR THUMBNAIL (200x200px)
        // ============================================
        const THUMBNAIL_SIZE = 200
        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = THUMBNAIL_SIZE
        thumbCanvas.height = THUMBNAIL_SIZE
        const thumbCtx = thumbCanvas.getContext('2d')
        
        // Calcular crop para mantener aspect ratio
        const thumbAspect = THUMBNAIL_SIZE / THUMBNAIL_SIZE
        const imgAspect = originalWidth / originalHeight
        
        let sx = 0, sy = 0, sw = originalWidth, sh = originalHeight
        
        if (imgAspect > thumbAspect) {
          // Imagen más ancha - crop horizontal
          sw = originalHeight * thumbAspect
          sx = (originalWidth - sw) / 2
        } else {
          // Imagen más alta - crop vertical
          sh = originalWidth / thumbAspect
          sy = (originalHeight - sh) / 2
        }
        
        thumbCtx?.drawImage(
          img,
          sx, sy, sw, sh,  // Source crop
          0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE  // Destination
        )
        
        // ============================================
        // 3. CONVERTIR A FILES
        // ============================================
        let fullFile: File | null = null
        let thumbFile: File | null = null
        let completed = 0
        
        const checkComplete = () => {
          completed++
          if (completed === 2 && fullFile && thumbFile) {
            const originalSize = (file.size / 1024 / 1024).toFixed(2)
            const fullSize = (fullFile.size / 1024 / 1024).toFixed(2)
            const thumbSize = (thumbFile.size / 1024).toFixed(0)
            console.log(`📸 Imagen optimizada: ${originalSize}MB → ${fullSize}MB (full) + ${thumbSize}KB (thumb)`)
            resolve({ full: fullFile, thumbnail: thumbFile })
          }
        }
        
        // ✅ OPTIMIZACIÓN MÓVIL: Calidad reducida para archivos más pequeños
        const fullQuality = isMobile ? 0.65 : 0.8  // Móvil: 65%, Desktop: 80%
        const thumbQuality = isMobile ? 0.75 : 0.85  // Móvil: 75%, Desktop: 85%
        
        // Generar imagen completa
        fullCanvas.toBlob(
          (blob) => {
            if (blob) {
              fullFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              checkComplete()
            } else {
              reject(new Error('Error al comprimir imagen completa'))
            }
          },
          'image/jpeg',
          fullQuality
        )
        
        // Generar thumbnail
        thumbCanvas.toBlob(
          (blob) => {
            if (blob) {
              thumbFile = new File([blob], `thumb_${file.name}`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              checkComplete()
            } else {
              reject(new Error('Error al generar thumbnail'))
            }
          },
          'image/jpeg',
          thumbQuality
        )
      }
      
      img.onerror = () => reject(new Error('Error al cargar imagen'))
    }
    
    reader.onerror = () => reject(new Error('Error al leer archivo'))
  })
}

// ✅ OPTIMIZACIÓN: Memoizar componente para evitar renders innecesarios
export const WorkOrderImageManager = React.memo(function WorkOrderImageManager({
  orderId,
  images,
  onImagesChange,
  currentStatus,
  userId,
  maxImages = 20
}: WorkOrderImageManagerProps) {
  const { user } = useAuth()
  const { organizationId } = useSession() // ✅ Obtener organizationId del contexto
  const supabase = createClient()
  
  // 🔧 FIX: Obtener token de sesión directamente desde Supabase client
  const [uploading, setUploading] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<WorkOrderImage | null>(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [editingCategory, setEditingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState<ImageCategory>('reception')
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory>('reception')
  
  // Log cuando cambie la categoría
  console.log('🔄 [CategoryState] Categoría actual:', selectedCategory)
  const [uploadDescription, setUploadDescription] = useState('')
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set())
  
  // Refs para inputs de archivo
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Detectar si es dispositivo móvil
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // Detectar soporte de cámara
  const [cameraSupported, setCameraSupported] = useState(false)
  
  useEffect(() => {
    // Verificar si el navegador soporta getUserMedia (cámara)
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setCameraSupported(true)
      console.log('📱 [CameraSupport] Cámara soportada en este dispositivo')
    } else {
      console.log('📱 [CameraSupport] Cámara NO soportada en este dispositivo')
    }
  }, [])

  
  // Sugerir categoría basada en el estado actual de la orden
  const getSuggestedCategory = (status: string): ImageCategory => {
    switch (status) {
      case 'reception': return 'reception'
      case 'diagnosis': return 'damage'
      case 'disassembly': return 'process'
      case 'assembly': return 'process'
      case 'testing': return 'process'
      case 'completed': return 'completed'
      case 'ready': return 'completed'
      default: return 'reception'
    }
  }
  
  // Inicializar categoría sugerida
  const suggestedCategory = getSuggestedCategory(currentStatus)
  
  
  if (selectedCategory === 'reception' && suggestedCategory !== 'reception') {
    console.log('💡 [CategorySuggestion] Sugiriendo categoría:', suggestedCategory, 'para estado:', currentStatus)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      console.log('❌ [handleFileChange] No se seleccionaron archivos')
      return
    }
    const categoryForUpload: ImageCategory = (e.target.getAttribute('data-category') as ImageCategory) || selectedCategory
    const filesArray = Array.from(files)
    console.log('🔄 [handleFileChange] Archivos seleccionados:', filesArray.length)

    // Validar límite total
    if (images.length + filesArray.length > maxImages) {
      toast.error(`Máximo ${maxImages} imágenes por orden. Ya tienes ${images.length} y estás intentando subir ${filesArray.length}`)
      e.target.value = ''
      return
    }

    setUploading(true)
    console.log('🔄 [handleFileChange] Iniciando subida de múltiples imágenes...')

    try {
      // ✅ Obtener token de sesión desde Supabase client (una sola vez)
      console.log('🔐 [CONTEXT] Obteniendo sesión de Supabase...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('🔐 ¿Tiene sesión?:', !!session)
      console.log('🔐 ¿Tiene token?:', !!session?.access_token)
      console.log('🔐 Error de sesión:', sessionError)

      if (!session?.access_token) {
        console.error('❌ [CONTEXT] No hay token en el contexto')
        toast.error('Sesión inválida. Por favor inicia sesión nuevamente.')
        setUploading(false)
        return
      }

      console.log('✅ [CONTEXT] Token disponible desde sesión')
      
      // Procesar y subir todas las imágenes en paralelo
      toast.info(`Procesando ${filesArray.length} imagen${filesArray.length > 1 ? 'es' : ''}...`, { duration: 2000 })
      
      // ✅ OPTIMIZACIÓN MÓVIL: Limitar procesamiento en paralelo (máx 2 a la vez)
      const isMobile = typeof window !== 'undefined' && 
        (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth < 768)
      const maxConcurrent = isMobile ? 2 : 5  // Móvil: 2, Desktop: 5
      
      // Procesar imágenes en lotes para evitar sobrecarga en móvil
      const processFile = async (file: File, index: number, total: number) => {
        try {
          // ✅ OPTIMIZACIÓN: Comprimir y generar thumbnail
          console.log(`📸 [${index + 1}/${total}] Procesando imagen:`, file.name)
          console.log(`📊 [${index + 1}/${total}] Tamaño original:`, (file.size / 1024 / 1024).toFixed(2), 'MB')

          let fullFile = file
          let thumbFile: File | null = null

          try {
            if (file.type.startsWith('image/')) {
              // ✅ Generar imagen completa + thumbnail
              const { full, thumbnail } = await compressImage(file)
              fullFile = full
              thumbFile = thumbnail
              
              const fullSizeKB = (fullFile.size / 1024).toFixed(0)
              const thumbSizeKB = (thumbFile.size / 1024).toFixed(0)
              console.log(`✅ [${index + 1}/${total}] Optimizada: ${fullSizeKB}KB (full) + ${thumbSizeKB}KB (thumb)`)
            }
          } catch (error) {
            console.error(`❌ [${index + 1}/${total}] Error optimizando imagen:`, error)
            // Continuar con archivo original si falla la compresión
          }

          // ✅ Subir thumbnail primero (más rápido, mejor UX)
          let thumbnailUrl: string | undefined
          let thumbnailPath: string | undefined
          
          if (thumbFile) {
            try {
              if (!organizationId) {
                throw new Error('Organization ID no disponible')
              }
              
              const thumbResult = await uploadWorkOrderImage(
                thumbFile,
                orderId,
                organizationId,
                userId,
                `${categoryForUpload}_thumb`,
                uploadDescription || undefined,
                currentStatus,
                session.access_token
              )
              
              if (thumbResult.success && thumbResult.data) {
                thumbnailUrl = thumbResult.data.url
                thumbnailPath = thumbResult.data.path
                console.log(`✅ [${index + 1}/${total}] Thumbnail subido`)
              }
            } catch (thumbError) {
              console.warn(`⚠️ [${index + 1}/${total}] Error subiendo thumbnail (no crítico):`, thumbError)
            }
          }
          
          // ✅ Subir imagen completa
          console.log(`📊 [${index + 1}/${total}] Subiendo imagen completa:`, (fullFile.size / 1024 / 1024).toFixed(2), 'MB')
          
          if (!organizationId) {
            throw new Error('Organization ID no disponible')
          }
          
          const uploadResult = await uploadWorkOrderImage(
            fullFile,
            orderId,
            organizationId,
            userId,
            categoryForUpload,
            uploadDescription || undefined,
            currentStatus,
            session.access_token
          )

          if (!uploadResult.success || !uploadResult.data) {
            console.error(`❌ [${index + 1}/${total}] Falló la subida:`, uploadResult.error)
            throw new Error(uploadResult.error || `Error al subir ${file.name}`)
          }

          const imageData = {
            ...uploadResult.data,
            thumbnailUrl,
            thumbnailPath
          }

          console.log(`✅ [${index + 1}/${total}] Upload completado:`, file.name)
          return imageData
        } catch (error: any) {
          console.error(`❌ [${index + 1}/${total}] Error:`, error)
          throw error
        }
      }

      // ✅ Procesar en lotes para evitar sobrecarga en móvil
      const uploadResults: any[] = []
      for (let i = 0; i < filesArray.length; i += maxConcurrent) {
        const batch = filesArray.slice(i, i + maxConcurrent)
        try {
          const batchResults = await Promise.all(batch.map((file, batchIndex) => 
            processFile(file, i + batchIndex, filesArray.length).catch(error => {
              console.error(`Error procesando archivo ${file.name}:`, error)
              return null  // Continuar con otros archivos si uno falla
            })
          ))
          uploadResults.push(...batchResults.filter(r => r !== null))
        } catch (batchError) {
          console.error(`Error procesando lote ${Math.floor(i / maxConcurrent) + 1}:`, batchError)
        }
      }
      const successfulUploads = uploadResults.filter(result => result !== null)

      console.log(`✅ [handleFileChange] ${successfulUploads.length}/${filesArray.length} imágenes subidas exitosamente`)

      if (successfulUploads.length === 0) {
        toast.error('No se pudo subir ninguna imagen')
        return
      }

      // ✅ Persistir todas las imágenes en BD usando API route (una sola petición)
      console.log('💾 [PERSIST] Guardando en BD via API...')

      try {
        const response = await fetch(`/api/work-orders/${orderId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: successfulUploads })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Error al guardar en BD')
        }
        
        console.log('✅ [PERSIST] Guardado exitosamente')
      } catch (error: any) {
        console.error('❌ [PERSIST] Error:', error)
        toast.error(error.message || 'Error al guardar imágenes')
        return
      }

      // Actualizar UI con todas las imágenes nuevas
      const newImagesList = [...images, ...successfulUploads]
      onImagesChange(newImagesList)

      // ✅ Abrir automáticamente el modal de la última foto subida para editar categoría/descripción
      if (successfulUploads.length > 0) {
        const lastUploadedImage = successfulUploads[successfulUploads.length - 1]
        // Esperar un momento para que la UI se actualice
        setTimeout(() => {
          openImageDetail(lastUploadedImage)
          // Activar edición de categoría automáticamente para que pueda cambiarla si se equivocó
          setEditingCategory(true)
          // Si no tiene descripción, también activar edición de descripción
          if (!lastUploadedImage.description) {
            setEditingDescription(true)
          }
        }, 300)
      }

      if (successfulUploads.length === filesArray.length) {
        toast.success(`${successfulUploads.length} imagen${successfulUploads.length > 1 ? 'es' : ''} subida${successfulUploads.length > 1 ? 's' : ''} exitosamente. Puedes editar categoría y descripción.`)
      } else {
        toast.warning(`${successfulUploads.length} de ${filesArray.length} imagen${filesArray.length > 1 ? 'es' : ''} subida${successfulUploads.length > 1 ? 's' : ''} exitosamente`)
      }

      // Limpiar
      e.target.value = ''
      setUploadDescription('')
    } catch (error: any) {
      console.error('❌ [handleFileChange] Error general:', error)
      toast.error(error.message || 'Error al subir imágenes')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (index: number) => {
    const image = images[index]
    setDeletingIndex(index)

    try {
      // ✅ Usar API route en lugar de query directa
      const response = await fetch(`/api/work-orders/${orderId}/images?imagePath=${encodeURIComponent(image.path)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar imagen')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar imagen')
      }

      const updatedImages = images.filter((_, i) => i !== index)
      onImagesChange(updatedImages)

      toast.success('Imagen eliminada')
      
      if (selectedImage?.path === image.path) {
        setSelectedImage(null)
      }
    } catch (error: any) {
      console.error('❌ [handleDelete] Error:', error)
      toast.error(error.message || 'Error al eliminar imagen')
    } finally {
      setDeletingIndex(null)
    }
  }

  const patchImageMetadata = async (updates: { category?: ImageCategory; description?: string }) => {
    const res = await fetch(`/api/work-orders/${orderId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imagePath: selectedImage!.path,
        ...updates
      })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Error al actualizar')
    }
    const updatedImages = images.map(img =>
      img.path === selectedImage!.path ? { ...img, ...updates } : img
    ) as WorkOrderImage[]
    onImagesChange(updatedImages, { skipRefetch: true })
    setSelectedImage({ ...selectedImage!, ...updates } as WorkOrderImage)
  }

  /** Un solo guardado: persiste categoría y/o descripción si cambiaron y cierra edición */
  const handleSaveChanges = async () => {
    if (!selectedImage) return
    const categoryChanged = newCategory !== selectedImage.category
    const descriptionChanged = newDescription !== (selectedImage.description || '')
    if (!categoryChanged && !descriptionChanged) {
      setEditingCategory(false)
      setEditingDescription(false)
      return
    }
    try {
      await patchImageMetadata({
        ...(categoryChanged && { category: newCategory as ImageCategory }),
        ...(descriptionChanged && { description: newDescription })
      })
      setEditingCategory(false)
      setEditingDescription(false)
      toast.success('Cambios guardados')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    }
  }

  const openImageDetail = (image: WorkOrderImage) => {
    setSelectedImage(image)
    setNewDescription(image.description || '')
    setNewCategory(image.category)
    setEditingDescription(false)
    setEditingCategory(false)
    clearImageError(image.path)
  }

  const markImageError = (path: string) => {
    setImageLoadErrors(prev => new Set(prev).add(path))
  }
  const clearImageError = (path: string) => {
    setImageLoadErrors(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }

  // Agrupar por categoría (legacy 'other' → 'reception')
  const imagesByCategory = images.reduce((acc, img) => {
    const cat = (String(img.category) === 'other' ? 'reception' : img.category) as ImageCategory
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(img)
    return acc
  }, {} as Record<ImageCategory, WorkOrderImage[]>)

  return (
    <div className="space-y-6">
      {/* Controles de subida */}
      <Card className="border-dashed bg-accent/30">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Agregar Fotos</h3>
              </div>
              <Badge variant="secondary">
                {images.length}/{maxImages}
              </Badge>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  console.log('🔄 [CategoryChange] Cambiando categoría de', selectedCategory, 'a', value)
                  setSelectedCategory(value as ImageCategory)
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getCategoryInfo(selectedCategory).color}`} />
                      {getCategoryInfo(selectedCategory).label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      className="hover:bg-slate-800 focus:bg-slate-800 text-white"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Estado actual: <span className="font-medium capitalize">{currentStatus}</span>
                </p>
                {suggestedCategory !== selectedCategory && suggestedCategory !== 'reception' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      console.log('💡 [QuickSuggestion] Aplicando sugerencia:', suggestedCategory)
                      setSelectedCategory(suggestedCategory)
                    }}
                  >
                    💡 Sugerir: {getCategoryInfo(suggestedCategory).label}
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                placeholder="Ej: Golpe en puerta trasera derecha"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>

            {/* Estado Actual */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="text-xs">
                💡 <strong>Tomar Foto:</strong> Abre cámara directa del dispositivo
              </div>
            </div>

            {/* Input oculto para CÁMARA — siempre usa Recepción */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading || images.length >= maxImages}
              // Nota: No agregamos 'multiple' aquí porque capture="environment" generalmente no lo soporta bien
            />

            {/* Input oculto para GALERÍA - Permite múltiples archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading || images.length >= maxImages}
            />


            {/* Botones de acción */}
            <div className="grid grid-cols-2 gap-3">
              {/* Botón: Tomar Foto — usa la categoría seleccionada en el dropdown */}
              <Button
                onClick={() => {
                  cameraInputRef.current?.click()
                }}
                disabled={uploading || images.length >= maxImages}
                className="w-full"
                variant="primary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Tomar Foto
                  </>
                )}
              </Button>

              {/* Botón: Desde Galería */}
              <Button
                onClick={() => {
                  console.log('📁 [Galería] Botón clickeado - usando ref')
                  fileInputRef.current?.click()
                }}
                disabled={uploading || images.length >= maxImages}
                className="w-full"
                variant="outline"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Desde Galería
                  </>
                )}
              </Button>
            </div>

            {/* Contador de imágenes */}
            <div className="text-xs text-muted-foreground text-center">
              {images.length}/{maxImages} fotos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imágenes por categoría */}
      {images.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(imagesByCategory).map(([category, categoryImages]) => (
            <CategoryGallery
              key={category}
              category={category as ImageCategory}
              categoryImages={categoryImages}
              images={images}
              onDelete={handleDelete}
              onOpenDetail={openImageDetail}
              deletingIndex={deletingIndex}
              imageLoadErrors={imageLoadErrors}
              markImageError={markImageError}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="mx-auto h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No hay imágenes</p>
            <p className="text-sm">Documenta el estado del vehículo con fotos</p>
          </div>
        </Card>
      )}


      {/* Modal de imagen en detalle — overlay oscuro para no confundir con las imágenes de atrás */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl" overlayClassName="bg-black/95">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getCategoryInfo(editingCategory ? newCategory : selectedImage.category).color}`} />
                  {getCategoryInfo(editingCategory ? newCategory : selectedImage.category).label}
                </DialogTitle>
                <DialogDescription>
                  Subida el {format(new Date(selectedImage.uploadedAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Imagen grande */}
                <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden">
                  {imageLoadErrors.has(selectedImage.path) ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No se pudo cargar la imagen. Revisa permisos del almacenamiento.
                    </div>
                  ) : (
                    <Image
                      src={selectedImage.url}
                      alt={selectedImage.description || selectedImage.name}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      onError={() => markImageError(selectedImage.path)}
                    />
                  )}
                </div>

                {/* Categoría y Descripción: un solo flujo de edición con un Guardar */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Categoría</Label>
                      {!editingCategory && !editingDescription && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategory(true)
                            setEditingDescription(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar categoría y descripción
                        </Button>
                      )}
                    </div>
                    {editingCategory ? (
                      <Select
                        value={newCategory}
                        onValueChange={(value) => setNewCategory(value as ImageCategory)}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getCategoryInfo(newCategory).color}`} />
                              {getCategoryInfo(newCategory).label}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white">
                          {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
                            <SelectItem
                              key={key}
                              value={key}
                              className="hover:bg-slate-800 focus:bg-slate-800 text-white"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${color}`} />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryInfo(selectedImage.category).color}`} />
                        <p className="text-sm font-medium">
                          {getCategoryInfo(selectedImage.category).label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    {editingDescription ? (
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Describe qué se muestra en la foto..."
                        rows={3}
                        className="bg-slate-950 text-slate-100 placeholder:text-slate-500 border-slate-700"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedImage.description || 'Sin descripción'}
                      </p>
                    )}
                  </div>

                  {(editingCategory || editingDescription) && (
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveChanges}>
                        Guardar cambios
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingCategory(false)
                          setEditingDescription(false)
                          setNewCategory(selectedImage.category)
                          setNewDescription(selectedImage.description || '')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Tamaño</p>
                    <p className="text-muted-foreground">
                      {selectedImage.size != null
                        ? ((selectedImage.size / 1024 / 1024).toFixed(2) + ' MB')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Estado de la orden</p>
                    <p className="text-muted-foreground capitalize">
                      {selectedImage.orderStatus}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}, (prevProps, nextProps) => {
  // ✅ OPTIMIZACIÓN: Re-renderizar si cambian props relevantes O contenido de imágenes
  if (prevProps.orderId !== nextProps.orderId) return false
  if (prevProps.currentStatus !== nextProps.currentStatus) return false
  if (prevProps.userId !== nextProps.userId) return false
  if (prevProps.maxImages !== nextProps.maxImages) return false

  // ✅ FIX: Comparar contenido de imágenes, no solo el length
  if (prevProps.images.length !== nextProps.images.length) return false

  // Verificar si alguna imagen cambió (categoría, descripción, url)
  for (let i = 0; i < nextProps.images.length; i++) {
    const prev = prevProps.images[i]
    const next = nextProps.images[i]
    if (!prev || !next) return false
    if (prev.path !== next.path) return false
    if (prev.category !== next.category) return false
    if (prev.description !== next.description) return false
    if (prev.url !== next.url) return false
  }

  return true
})

/** Componente de galería para cada categoría con paginación integrada */
function CategoryGallery({ 
  category, 
  categoryImages, 
  images, 
  onDelete, 
  onOpenDetail, 
  deletingIndex, 
  imageLoadErrors, 
  markImageError 
}: { 
  category: ImageCategory, 
  categoryImages: WorkOrderImage[], 
  images: WorkOrderImage[], 
  onDelete: (index: number) => void, 
  onOpenDetail: (image: WorkOrderImage) => void, 
  deletingIndex: number | null, 
  imageLoadErrors: Set<string>, 
  markImageError: (path: string) => void 
}) {
  const { paginatedItems, hasMore, loadMore, total, showing } = useImagePagination(categoryImages, { itemsPerPage: 5 })
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getCategoryInfo(category).color}`} />
        <h4 className="font-semibold">
          {getCategoryInfo(category).label} ({total})
        </h4>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginatedItems.map((image) => {
          const globalIndex = images.indexOf(image)
          return (
            <ImageCard
              key={image.path}
              image={image}
              globalIndex={globalIndex}
              onDelete={onDelete}
              onOpenDetail={onOpenDetail}
              deletingIndex={deletingIndex}
              imageLoadErrors={imageLoadErrors}
              markImageError={markImageError}
            />
          )
        })}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-primary"
          onClick={loadMore}
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Ver más ({total - showing} restantes)
        </Button>
      )}
    </div>
  )
}

/** Componente de tarjeta de imagen individual con Lazy Loading e Intersection Observer */
function ImageCard({ 
  image, 
  globalIndex, 
  onDelete, 
  onOpenDetail, 
  deletingIndex, 
  imageLoadErrors, 
  markImageError 
}: { 
  image: WorkOrderImage, 
  globalIndex: number, 
  onDelete: (index: number) => void, 
  onOpenDetail: (image: WorkOrderImage) => void, 
  deletingIndex: number | null, 
  imageLoadErrors: Set<string>, 
  markImageError: (path: string) => void 
}) {
  const { ref, hasIntersected } = useIntersectionObserver()

  return (
    <Card 
      ref={ref}
      className="relative group overflow-hidden cursor-pointer bg-muted/20"
    >
      <div className="aspect-square relative" onClick={() => onOpenDetail(image)}>
        {hasIntersected ? (
          imageLoadErrors.has(image.path) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-xs text-center p-2">
              No se pudo cargar la imagen
            </div>
          ) : (
            <Image
              src={image.thumbnailUrl || image.url}
              alt={image.description || image.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, 20vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              onError={() => markImageError(image.path)}
            />
          )
        ) : (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground opacity-20" />
          </div>
        )}
      </div>

      {/* Overlay con info */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetail(image)
            }}
            title="Ver detalles"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(globalIndex)
            }}
            disabled={deletingIndex === globalIndex}
            title="Eliminar"
          >
            {deletingIndex === globalIndex ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="text-white text-xs space-y-1">
          {image.description && (
            <p className="line-clamp-2">{image.description}</p>
          )}
          <p className="text-white/70">
            {format(new Date(image.uploadedAt), 'dd/MM HH:mm', { locale: es })}
          </p>
        </div>
      </div>
    </Card>
  )
}

