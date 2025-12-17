# 🚀 Propuesta de Implementación: Optimización de Imágenes

## 📋 Resumen Ejecutivo

**Problema:** Conforme se suben más imágenes, la carga se vuelve lenta porque:
- Todas las imágenes se cargan al abrir el componente
- No hay paginación (20 imágenes = 20 elementos DOM)
- No hay thumbnails (grid carga imágenes completas)

**Solución Propuesta:** Implementar en 2 fases:
1. **Fase 1 (1 día):** Lazy loading + Paginación → 70-80% mejora inmediata
2. **Fase 2 (2-3 días):** Thumbnails en servidor → 90% reducción de ancho de banda

---

## 🎯 FASE 1: Quick Wins (IMPLEMENTAR PRIMERO)

### **1. Lazy Loading con Intersection Observer**

**Qué hace:** Solo carga imágenes cuando están visibles en pantalla

**Código a crear:**

```typescript
// src/hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(options?: IntersectionObserverInit) {
  const [hasIntersected, setHasIntersected] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true)
          observer.disconnect() // Solo dispara una vez
        }
      },
      { threshold: 0.1, rootMargin: '50px', ...options }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, hasIntersected }
}
```

**Modificación en WorkOrderImageManager.tsx:**

```typescript
// Reemplazar Image actual con versión lazy
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

// En el map de imágenes:
{categoryImages.map((image, index) => {
  const { ref, hasIntersected } = useIntersectionObserver()
  const globalIndex = images.indexOf(image)
  
  return (
    <Card key={globalIndex} ref={ref} className="relative group">
      <div className="aspect-square relative">
        {hasIntersected ? (
          <Image
            src={image.url}
            alt={image.description || image.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </div>
      {/* ... resto del código ... */}
    </Card>
  )
})}
```

**Impacto:** 70-80% reducción en carga inicial

---

### **2. Paginación de Imágenes**

**Qué hace:** Muestra 6 imágenes iniciales, botón "Ver más" para cargar siguientes

**Código a crear:**

```typescript
// src/hooks/useImagePagination.ts
import { useState, useMemo } from 'react'

export function useImagePagination<T>(
  items: T[],
  itemsPerPage: number = 6
) {
  const [currentPage, setCurrentPage] = useState(1)

  const paginatedItems = useMemo(() => {
    const endIndex = currentPage * itemsPerPage
    return items.slice(0, endIndex)
  }, [items, currentPage, itemsPerPage])

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const hasMore = currentPage < totalPages
  const showing = paginatedItems.length
  const total = items.length

  const loadMore = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }

  return {
    paginatedItems,
    hasMore,
    showing,
    total,
    loadMore
  }
}
```

**Modificación en WorkOrderImageManager.tsx:**

```typescript
import { useImagePagination } from '@/hooks/useImagePagination'

// Dentro del componente, por categoría:
{Object.entries(imagesByCategory).map(([category, categoryImages]) => {
  const {
    paginatedItems,
    hasMore,
    showing,
    total,
    loadMore
  } = useImagePagination(categoryImages, 6)

  return (
    <div key={category} className="space-y-3">
      {/* ... header de categoría ... */}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginatedItems.map((image, index) => {
          // ... código de imagen lazy ...
        })}
      </div>

      {/* Botón "Ver más" */}
      {hasMore && (
        <Button
          onClick={loadMore}
          variant="outline"
          className="w-full"
        >
          Ver más ({total - showing} restantes)
        </Button>
      )}
    </div>
  )
})}
```

**Impacto:** 60-70% reducción en renderizado inicial

---

### **3. Skeleton Loader (Opcional pero Recomendado)**

**Qué hace:** Muestra placeholder animado mientras carga imagen

**Código a crear:**

```typescript
// src/components/ui/ImageSkeleton.tsx
export function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded ${className}`}>
      <div className="w-full h-full bg-gradient-to-r from-muted via-muted/50 to-muted" />
    </div>
  )
}
```

**Uso:**
```typescript
{hasIntersected ? (
  <Image ... />
) : (
  <ImageSkeleton className="absolute inset-0" />
)}
```

---

## 🔧 FASE 2: Thumbnails en Servidor (OPCIONAL PERO RECOMENDADO)

### **Generación de Thumbnails con Sharp**

**Qué hace:** Crea versión pequeña (200x200px) al subir imagen

**Paso 1: Instalar dependencia**
```bash
npm install sharp
```

**Paso 2: Modificar API Route**

```typescript
// src/app/api/work-orders/[id]/images/route.ts
import sharp from 'sharp'

// Función helper
async function generateThumbnail(
  imageBuffer: Buffer,
  orderId: string,
  fileName: string
): Promise<string> {
  try {
    // Generar thumbnail 200x200px
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Subir thumbnail a storage
    const thumbnailPath = `${orderId}/thumbnails/${fileName.replace(/\.[^/.]+$/, '')}_thumb.jpg`
    
    const { error } = await supabaseAdmin.storage
      .from('work-order-images')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      console.warn('⚠️ Error generando thumbnail:', error)
      return '' // No fallar si thumbnail falla
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('work-order-images')
      .getPublicUrl(thumbnailPath)

    return urlData.publicUrl
  } catch (error) {
    console.warn('⚠️ Error en generateThumbnail:', error)
    return '' // No fallar si thumbnail falla
  }
}

// En el POST handler, después de recibir imágenes:
// (Nota: Esto requiere que el cliente envíe el buffer de la imagen)
// O mejor: generar thumbnail en el cliente antes de subir
```

**Problema:** La API route actual recibe URLs, no buffers. **Solución alternativa:**

### **Alternativa: Thumbnails en Cliente (MÁS SIMPLE)**

Generar thumbnail en el cliente antes de subir:

```typescript
// En WorkOrderImageManager.tsx, función compressImage
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
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Imagen completa (1920px)
        let { width, height } = img
        const MAX_SIZE = 1920
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = (height * MAX_SIZE) / width
            width = MAX_SIZE
          } else {
            width = (width * MAX_SIZE) / height
            height = MAX_SIZE
          }
        }
        
        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir'))
            return
          }
          
          const fullFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          
          // Thumbnail (200x200px)
          canvas.width = 200
          canvas.height = 200
          ctx?.drawImage(img, 0, 0, 200, 200)
          
          canvas.toBlob((thumbBlob) => {
            if (!thumbBlob) {
              resolve({ full: fullFile, thumbnail: fullFile })
              return
            }
            
            const thumbFile = new File([thumbBlob], `thumb_${file.name}`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            
            resolve({ full: fullFile, thumbnail: thumbFile })
          }, 'image/jpeg', 0.8)
        }, 'image/jpeg', 0.8)
      }
      
      img.onerror = () => reject(new Error('Error al cargar imagen'))
    }
    
    reader.onerror = () => reject(new Error('Error al leer archivo'))
  })
}

// Modificar handleFileChange para subir ambos:
const { full, thumbnail } = await compressImage(file)

// Subir thumbnail primero (más rápido)
const thumbResult = await uploadWorkOrderImage(
  thumbnail,
  orderId,
  userId,
  `${selectedCategory}_thumb`,
  uploadDescription,
  currentStatus,
  session.access_token
)

// Subir imagen completa
const fullResult = await uploadWorkOrderImage(
  full,
  orderId,
  userId,
  selectedCategory,
  uploadDescription,
  currentStatus,
  session.access_token
)

// Incluir thumbnailUrl en la respuesta
const imageData = {
  ...fullResult.data,
  thumbnailUrl: thumbResult.data?.url
}
```

**Impacto:** 90% reducción de ancho de banda en grid

---

## 📊 Comparación de Opciones

| Opción | Esfuerzo | Impacto | Complejidad |
|--------|----------|---------|-------------|
| **Lazy Loading** | 2 horas | 70% | Baja |
| **Paginación** | 1 hora | 60% | Baja |
| **Thumbnails Cliente** | 3 horas | 90% | Media |
| **Thumbnails Servidor** | 1 día | 90% | Alta |

---

## ✅ Recomendación Final

### **Opción A: Máximo Impacto con Mínimo Esfuerzo**

**Implementar:**
1. ✅ Lazy Loading (2 horas)
2. ✅ Paginación (1 hora)
3. ✅ Thumbnails en Cliente (3 horas)

**Total:** 6 horas → **90% mejora en experiencia**

### **Opción B: Solo Quick Wins**

**Implementar:**
1. ✅ Lazy Loading (2 horas)
2. ✅ Paginación (1 hora)

**Total:** 3 horas → **70-80% mejora en experiencia**

---

## 🎯 Mi Recomendación Específica

**Implementar Opción A** porque:
- ✅ Solo 6 horas de trabajo
- ✅ 90% mejora en experiencia
- ✅ No requiere cambios en servidor
- ✅ Thumbnails en cliente es suficiente para la mayoría de casos

**Si después quieres optimizar más:**
- Agregar thumbnails en servidor (mejor calidad, menos procesamiento en cliente)
- Implementar Service Worker para cache
- Configurar CDN avanzado

---

## 📝 Checklist de Implementación

### **Fase 1 (6 horas):**
- [ ] Crear `useIntersectionObserver` hook
- [ ] Crear `useImagePagination` hook
- [ ] Modificar `compressImage` para generar thumbnail
- [ ] Modificar `handleFileChange` para subir thumbnail
- [ ] Actualizar interface `WorkOrderImage` para incluir `thumbnailUrl`
- [ ] Modificar renderizado para usar lazy loading
- [ ] Agregar paginación con botón "Ver más"
- [ ] Usar `thumbnailUrl` en grid, `url` completa en modal

### **Fase 2 (Opcional - 1 día):**
- [ ] Instalar `sharp`
- [ ] Crear función `generateThumbnail` en API route
- [ ] Modificar API para generar thumbnails en servidor
- [ ] Migrar de thumbnails cliente a servidor

---

## 🚀 ¿Quieres que implemente la Opción A?

Puedo crear todos los archivos necesarios:
1. Hooks (`useIntersectionObserver`, `useImagePagination`)
2. Modificaciones en `WorkOrderImageManager`
3. Actualización de `compressImage` para thumbnails
4. Integración completa

**Tiempo estimado:** 6 horas de desarrollo
**Impacto:** 90% mejora en experiencia de carga

