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
  addImageToWorkOrder,
  removeImageFromWorkOrder,
  updateImageDescription,
  WorkOrderImage,
  ImageCategory
} from '@/lib/supabase/work-order-storage'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
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
 * Comprime imagen antes de subir a Supabase
 * Reduce tamaño de 4-12MB a ~500KB-1MB
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (e) => {
      // Crear elemento img usando HTMLImageElement para evitar conflicto con Next.js Image
      const img = document.createElement('img')
      img.src = e.target?.result as string
      
      img.onload = () => {
        // Redimensionar a máximo 1920px
        let { width, height } = img
        const MAX_SIZE = 1920
        
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width)
          width = MAX_SIZE
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height)
          height = MAX_SIZE
        }
        
        // Crear canvas y comprimir
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // Convertir a blob comprimido
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              
              const originalSize = (file.size / 1024 / 1024).toFixed(2)
              const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2)
              console.log(`📸 Imagen comprimida: ${originalSize}MB → ${compressedSize}MB`)
              
              resolve(compressedFile)
            } else {
              reject(new Error('Error al comprimir imagen'))
            }
          },
          'image/jpeg',
          0.8 // 80% de calidad (imperceptible a la vista)
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
  const { session } = useAuth()
  
  // 🔧 FIX: Use AuthContext token to avoid getSession() calls
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

    console.log('🔄 [handleFileChange] Archivo seleccionado:', {
      name: files[0].name,
      size: files[0].size,
      type: files[0].type
    })

    if (images.length >= maxImages) {
      toast.error(`Máximo ${maxImages} imágenes por orden`)
      return
    }

    setUploading(true)
    console.log('🔄 [handleFileChange] Iniciando subida...')

    try {
      const file = files[0]
      
      // Comprimir imagen antes de subir
      console.log('📸 Procesando imagen...')
      console.log('📊 Tamaño original:', (file.size / 1024 / 1024).toFixed(2), 'MB')

      let fileToUpload = file

      try {
        if (file.type.startsWith('image/')) {
          toast.info('Optimizando imagen...', { duration: 2000 })
          fileToUpload = await compressImage(file)
          const sizeKB = (fileToUpload.size / 1024).toFixed(0)
          toast.success(`Imagen optimizada: ${sizeKB}KB`, { duration: 2000 })
        }
      } catch (error) {
        console.error('❌ Error comprimiendo imagen:', error)
        toast.warning('Subiendo imagen sin comprimir...', { duration: 2000 })
        fileToUpload = file
      }

      console.log('📊 Tamaño a subir:', (fileToUpload.size / 1024 / 1024).toFixed(2), 'MB')

      // ✅ Usar sesión del contexto (ya está disponible, sin await)
      console.log('🔐 [CONTEXT] Usando sesión del AuthContext')
      console.log('🔐 ¿Tiene sesión del contexto?:', !!session)
      console.log('🔐 ¿Tiene token?:', !!session?.access_token)

      if (!session?.access_token) {
        console.error('❌ [CONTEXT] No hay token en el contexto')
        toast.error('Sesión inválida. Recarga la página.')
        setUploading(false)
        return
      }

      console.log('✅ [CONTEXT] Token disponible desde contexto')
      
      // Subir imagen
      const uploadResult = await uploadWorkOrderImage(
        fileToUpload,
        orderId,
        userId,
        selectedCategory,
        uploadDescription || undefined,
        currentStatus,
        session?.access_token
      )

      console.log('✅ [UPLOAD RESULT] Upload completado:', uploadResult)
      console.log('✅ [UPLOAD RESULT] Success:', uploadResult.success)
      console.log('✅ [UPLOAD RESULT] Data:', uploadResult.data)

      if (!uploadResult.success || !uploadResult.data) {
        console.error('❌ [UPLOAD RESULT] Falló la validación')
        toast.error(uploadResult.error || 'Error al subir imagen')
        return
      }

      // ✅ Imagen subida exitosamente a Storage
      // Persistir en BD usando API route (servidor)
      console.log('💾 [PERSIST] Guardando en BD via API...')

      try {
        const response = await fetch(`/api/orders/${orderId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadResult.data)
        })
        
        if (!response.ok) {
          throw new Error('Error al guardar en BD')
        }
        
        console.log('✅ [PERSIST] Guardado exitosamente')
      } catch (error) {
        console.error('❌ [PERSIST] Error:', error)
        toast.error('Error al guardar imagen')
        return
      }

      // Actualizar UI
      const newImagesList = [...images, uploadResult.data]
      onImagesChange(newImagesList)

      toast.success('Imagen subida exitosamente')

      // Limpiar
      e.target.value = ''
      setUploadDescription('')
    } catch (error: any) {
      toast.error(error.message || 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (index: number) => {
    const image = images[index]
    setDeletingIndex(index)

    try {
      const result = await removeImageFromWorkOrder(orderId, image.path)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar imagen')
        return
      }

      const updatedImages = images.filter((_, i) => i !== index)
      onImagesChange(updatedImages)

      toast.success('Imagen eliminada')
      
      if (selectedImage?.path === image.path) {
        setSelectedImage(null)
      }
    } catch (error: any) {
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
            />

            {/* Input oculto para GALERÍA */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
          {Object.entries(imagesByCategory).map(([category, categoryImages]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${CATEGORY_LABELS[category as ImageCategory].color}`} />
                <h4 className="font-semibold">
                  {CATEGORY_LABELS[category as ImageCategory].label} ({categoryImages.length})
                </h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {categoryImages.map((image, index) => {
                  const globalIndex = images.indexOf(image)
                  return (
                    <Card key={globalIndex} className="relative group overflow-hidden cursor-pointer">
                      <div className="aspect-square relative" onClick={() => openImageDetail(image)}>
                        <Image
                          src={image.url}
                          alt={image.description || image.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 20vw"
                        />
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
            </div>
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
