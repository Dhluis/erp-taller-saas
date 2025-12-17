'use client'

import { useState, useEffect, useRef } from 'react'
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
  Camera
} from 'lucide-react'
import { toast } from 'sonner'
import {
  uploadWorkOrderImage,
  updateImageDescription,
  WorkOrderImage,
  ImageCategory
} from '@/lib/supabase/work-order-storage'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/lib/context/SessionContext'
import Image from 'next/image'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WorkOrderImageManagerProps {
  orderId: string
  images: WorkOrderImage[]
  onImagesChange: (images: WorkOrderImage[]) => void
  currentStatus: string
  userId?: string
  maxImages?: number
}

const CATEGORY_LABELS: Record<ImageCategory, { label: string; color: string }> = {
  reception: { label: 'Recepción', color: 'bg-blue-500' },
  damage: { label: 'Daño', color: 'bg-red-500' },
  process: { label: 'Proceso', color: 'bg-yellow-500' },
  completed: { label: 'Completado', color: 'bg-green-500' },
  other: { label: 'Otro', color: 'bg-gray-500' }
}

/**
 * Comprime imagen y genera thumbnail
 * Reduce tamaño de 4-12MB a ~500KB-1MB (imagen completa)
 * Genera thumbnail de 200x200px (~10-20KB)
 */
async function compressImage(file: File): Promise<{
  full: File
  thumbnail: File
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.src = e.target?.result as string
      
      img.onload = () => {
        const originalWidth = img.width
        const originalHeight = img.height
        
        // ============================================
        // 1. GENERAR IMAGEN COMPLETA (1920px máximo)
        // ============================================
        let fullWidth = originalWidth
        let fullHeight = originalHeight
        const MAX_SIZE = 1920
        
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
          0.8 // 80% de calidad
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
          0.85 // 85% de calidad para thumbnail (más pequeño, puede ser más calidad)
        )
      }
      
      img.onerror = () => reject(new Error('Error al cargar imagen'))
    }
    
    reader.onerror = () => reject(new Error('Error al leer archivo'))
  })
}

export function WorkOrderImageManager({
  orderId,
  images,
  onImagesChange,
  currentStatus,
  userId,
  maxImages = 20
}: WorkOrderImageManagerProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  // 🔧 FIX: Obtener token de sesión directamente desde Supabase client
  const [uploading, setUploading] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<WorkOrderImage | null>(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory>('reception')
  
  // Log cuando cambie la categoría
  console.log('🔄 [CategoryState] Categoría actual:', selectedCategory)
  const [uploadDescription, setUploadDescription] = useState('')
  
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
      default: return 'other'
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
      
      const uploadPromises = filesArray.map(async (file, index) => {
        try {
          // ✅ OPTIMIZACIÓN: Comprimir y generar thumbnail
          console.log(`📸 [${index + 1}/${filesArray.length}] Procesando imagen:`, file.name)
          console.log(`📊 [${index + 1}/${filesArray.length}] Tamaño original:`, (file.size / 1024 / 1024).toFixed(2), 'MB')

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
              console.log(`✅ [${index + 1}/${filesArray.length}] Optimizada: ${fullSizeKB}KB (full) + ${thumbSizeKB}KB (thumb)`)
            }
          } catch (error) {
            console.error(`❌ [${index + 1}/${filesArray.length}] Error optimizando imagen:`, error)
            // Continuar con archivo original si falla la compresión
          }

          // ✅ Subir thumbnail primero (más rápido, mejor UX)
          let thumbnailUrl: string | undefined
          let thumbnailPath: string | undefined
          
          if (thumbFile) {
            try {
              const thumbResult = await uploadWorkOrderImage(
                thumbFile,
                orderId,
                userId,
                `${selectedCategory}_thumb`, // Categoría especial para thumbnails
                uploadDescription || undefined,
                currentStatus,
                session.access_token
              )
              
              if (thumbResult.success && thumbResult.data) {
                thumbnailUrl = thumbResult.data.url
                thumbnailPath = thumbResult.data.path
                console.log(`✅ [${index + 1}/${filesArray.length}] Thumbnail subido`)
              }
            } catch (thumbError) {
              console.warn(`⚠️ [${index + 1}/${filesArray.length}] Error subiendo thumbnail (no crítico):`, thumbError)
              // No fallar si thumbnail falla, continuar con imagen completa
            }
          }
          
          // ✅ Subir imagen completa
          console.log(`📊 [${index + 1}/${filesArray.length}] Subiendo imagen completa:`, (fullFile.size / 1024 / 1024).toFixed(2), 'MB')
          
          const uploadResult = await uploadWorkOrderImage(
            fullFile,
            orderId,
            userId,
            selectedCategory,
            uploadDescription || undefined,
            currentStatus,
            session.access_token
          )

          if (!uploadResult.success || !uploadResult.data) {
            console.error(`❌ [${index + 1}/${filesArray.length}] Falló la subida:`, uploadResult.error)
            throw new Error(uploadResult.error || `Error al subir ${file.name}`)
          }

          // ✅ Incluir thumbnailUrl en el resultado
          const imageData = {
            ...uploadResult.data,
            thumbnailUrl,
            thumbnailPath
          }

          console.log(`✅ [${index + 1}/${filesArray.length}] Upload completado:`, file.name)
          return imageData
        } catch (error: any) {
          console.error(`❌ [${index + 1}/${filesArray.length}] Error:`, error)
          throw error
        }
      })

      // Esperar a que todas las imágenes se suban
      const uploadResults = await Promise.all(uploadPromises)
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

      if (successfulUploads.length === filesArray.length) {
        toast.success(`${successfulUploads.length} imagen${successfulUploads.length > 1 ? 'es' : ''} subida${successfulUploads.length > 1 ? 's' : ''} exitosamente`)
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

  const handleUpdateDescription = async () => {
    if (!selectedImage) return

    try {
      const result = await updateImageDescription(
        orderId,
        selectedImage.path,
        newDescription
      )

      if (!result.success) {
        toast.error(result.error || 'Error al actualizar descripción')
        return
      }

      const updatedImages = images.map(img =>
        img.path === selectedImage.path
          ? { ...img, description: newDescription }
          : img
      )
      onImagesChange(updatedImages)

      setSelectedImage({ ...selectedImage, description: newDescription })
      setEditingDescription(false)
      toast.success('Descripción actualizada')
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar')
    }
  }

  const openImageDetail = (image: WorkOrderImage) => {
    setSelectedImage(image)
    setNewDescription(image.description || '')
  }

  // Agrupar por categoría
  const imagesByCategory = images.reduce((acc, img) => {
    if (!acc[img.category]) acc[img.category] = []
    acc[img.category].push(img)
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
                      <div className={`w-3 h-3 rounded-full ${CATEGORY_LABELS[selectedCategory].color}`} />
                      {CATEGORY_LABELS[selectedCategory].label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
                    <SelectItem key={key} value={key}>
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
                    💡 Sugerir: {CATEGORY_LABELS[suggestedCategory].label}
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

            {/* Input oculto para CÁMARA */}
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
              {/* Botón: Tomar Foto */}
              <Button
                onClick={() => {
                  console.log('📸 [Tomar Foto] Botón clickeado - usando ref')
                  console.log('🔍 Ref actual:', cameraInputRef.current)
                  console.log('🔍 Atributos del input:', {
                    type: cameraInputRef.current?.type,
                    accept: cameraInputRef.current?.accept,
                    capture: cameraInputRef.current?.getAttribute('capture')
                  })
                  cameraInputRef.current?.click()
                  console.log('✅ Click ejecutado en input de cámara')
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
          {Object.entries(imagesByCategory).map(([category, categoryImages]) => {
            // ✅ OPTIMIZACIÓN: Paginación por categoría
            const {
              paginatedItems,
              hasMore,
              showing,
              total,
              loadMore
            } = useImagePagination(categoryImages, { itemsPerPage: 6 })

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${CATEGORY_LABELS[category as ImageCategory].color}`} />
                  <h4 className="font-semibold">
                    {CATEGORY_LABELS[category as ImageCategory].label} ({total})
                    {showing < total && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (mostrando {showing})
                      </span>
                    )}
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {paginatedItems.map((image, index) => {
                    const globalIndex = images.indexOf(image)
                    // ✅ OPTIMIZACIÓN: Lazy loading por imagen
                    const { ref, hasIntersected } = useIntersectionObserver()
                    
                    return (
                      <Card 
                        key={globalIndex} 
                        ref={ref}
                        className="relative group overflow-hidden cursor-pointer"
                      >
                        <div className="aspect-square relative" onClick={() => openImageDetail(image)}>
                          {hasIntersected ? (
                            <Image
                              src={image.thumbnailUrl || image.url} // ✅ Usar thumbnail si existe
                              alt={image.description || image.name}
                              fill
                              className="object-cover transition-opacity duration-300"
                              sizes="(max-width: 768px) 50vw, 20vw"
                              loading="lazy"
                            />
                          ) : (
                            // ✅ Skeleton loader mientras no es visible
                            <div className="w-full h-full bg-muted animate-pulse">
                              <div className="w-full h-full bg-gradient-to-r from-muted via-muted/50 to-muted" />
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
                                openImageDetail(image)
                              }}
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(globalIndex)
                              }}
                              disabled={deletingIndex === globalIndex}
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
                              {format(new Date(image.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>

                {/* ✅ Botón "Ver más" para paginación */}
                {hasMore && (
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    className="w-full"
                  >
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Ver más ({total - showing} restantes)
                  </Button>
                )}
              </div>
            )
          })}
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

      {/* Modal de imagen en detalle */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${CATEGORY_LABELS[selectedImage.category].color}`} />
                  {CATEGORY_LABELS[selectedImage.category].label}
                </DialogTitle>
                <DialogDescription>
                  Subida el {format(new Date(selectedImage.uploadedAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Imagen grande */}
                <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={selectedImage.url}
                    alt={selectedImage.description || selectedImage.name}
                    fill
                    className="object-contain"
                    sizes="100vw"
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Descripción</Label>
                    {!editingDescription && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDescription(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </div>

                  {editingDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Describe qué se muestra en la foto..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateDescription}>
                          Guardar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setEditingDescription(false)
                            setNewDescription(selectedImage.description || '')
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedImage.description || 'Sin descripción'}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Tamaño</p>
                    <p className="text-muted-foreground">
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
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
}
