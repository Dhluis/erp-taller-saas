# 🔒 Análisis Multi-Tenant: Sistema de Imágenes

## ❌ PROBLEMA IDENTIFICADO

### **Estado Actual:**

1. **Path en Storage:**
   ```typescript
   fileName = `${orderId}/${category}-${timestamp}-${random}.${fileExt}`
   ```
   - ✅ Organizado por `orderId`
   - ❌ **NO incluye `organization_id`**

2. **Políticas de Storage:**
   ```sql
   -- Solo valida que el usuario esté autenticado
   CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'work-order-images' 
     AND auth.role() = 'authenticated'
   );
   ```
   - ❌ **NO valida `organization_id`**
   - ❌ Cualquier usuario autenticado puede subir a cualquier path

3. **Validación en API Route:**
   ```typescript
   // ✅ SÍ valida organization_id antes de guardar en BD
   .eq('organization_id', organizationId)
   ```
   - ✅ La API route SÍ valida que la orden pertenezca a la organización
   - ✅ Las imágenes se guardan en BD solo si la orden es de la organización

### **Riesgos:**

1. **Path Collision (Bajo pero posible):**
   - Si dos organizaciones tienen órdenes con el mismo `orderId` (muy improbable con UUIDs)
   - Las imágenes podrían sobreescribirse

2. **Acceso Directo a Storage (Medio):**
   - Un usuario autenticado podría intentar acceder directamente a Storage
   - Las políticas actuales solo validan autenticación, no `organization_id`
   - Sin embargo, el path incluye `orderId` que es UUID único, así que es difícil adivinar

3. **Aislamiento Incompleto (Alto):**
   - Las imágenes no están explícitamente organizadas por `organization_id` en Storage
   - Dificulta auditoría y limpieza por organización

---

## ✅ SOLUCIÓN PROPUESTA

### **Opción 1: Incluir `organization_id` en el Path (RECOMENDADO)**

**Ventajas:**
- ✅ Aislamiento explícito en Storage
- ✅ Fácil auditoría y limpieza
- ✅ Mejor organización de archivos
- ✅ Previene cualquier posibilidad de colisión

**Implementación:**
```typescript
// En uploadWorkOrderImage, obtener organization_id de la orden
const fileName = `${organizationId}/${orderId}/${category}-${timestamp}-${random}.${fileExt}`
```

**Path resultante:**
```
work-order-images/
  └── {organizationId}/
      └── {orderId}/
          ├── reception-1234567890-abc123.jpg
          ├── reception-1234567890-abc123_thumb.jpg
          └── ...
```

### **Opción 2: Políticas RLS en Storage (COMPLEMENTARIA)**

**Implementación:**
```sql
-- Política que valida organization_id desde el path
CREATE POLICY "Users can only upload to their organization" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::TEXT 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);
```

**Ventajas:**
- ✅ Validación a nivel de Storage
- ✅ Previene subidas no autorizadas incluso si alguien intenta bypass de API

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar AMBAS opciones:**

1. **Incluir `organization_id` en path** (Opción 1)
   - Mejora organización y aislamiento
   - Fácil de implementar (solo cambiar el path)

2. **Políticas RLS en Storage** (Opción 2)
   - Seguridad adicional a nivel de Storage
   - Previene bypass de API

**Orden de implementación:**
1. ✅ Primero: Incluir `organization_id` en path (rápido, impacto inmediato)
2. ✅ Después: Políticas RLS en Storage (seguridad adicional)

---

## 📝 CAMBIOS NECESARIOS

### **1. Modificar `uploadWorkOrderImage` para obtener `organization_id`**

```typescript
// Necesitamos obtener organization_id de la orden antes de subir
// Opción A: Pasar organization_id como parámetro
export async function uploadWorkOrderImage(
  file: File,
  orderId: string,
  organizationId: string, // ✅ NUEVO PARÁMETRO
  userId?: string,
  category?: string,
  description?: string,
  orderStatus?: string,
  accessToken?: string
)

// Opción B: Obtener organization_id desde la orden (más seguro)
// Hacer query a work_orders para obtener organization_id
const { data: order } = await supabaseAdmin
  .from('work_orders')
  .select('organization_id')
  .eq('id', orderId)
  .single()

if (!order?.organization_id) {
  return { success: false, error: 'Orden no encontrada' }
}

const fileName = `${order.organization_id}/${orderId}/${category}-${timestamp}-${random}.${fileExt}`
```

### **2. Modificar `WorkOrderImageManager` para pasar `organization_id`**

```typescript
// En handleFileChange, obtener organizationId del contexto
const { organizationId } = useOrganization()

// Pasar a uploadWorkOrderImage
const uploadResult = await uploadWorkOrderImage(
  fullFile,
  orderId,
  organizationId, // ✅ NUEVO
  userId,
  selectedCategory,
  uploadDescription || undefined,
  currentStatus,
  session.access_token
)
```

### **3. Actualizar políticas de Storage (opcional pero recomendado)**

Ver archivo `supabase-storage-setup-multitenant.sql` (a crear)

---

## ⚠️ CONSIDERACIONES

### **Migración de Imágenes Existentes:**

Si ya hay imágenes subidas sin `organization_id` en el path:
- Opción A: Dejar como están (funcionan, pero sin aislamiento explícito)
- Opción B: Migrar imágenes existentes a nuevo path (requiere script de migración)

**Recomendación:** Opción A para imágenes existentes, nuevo path para nuevas imágenes.

---

## ✅ CONCLUSIÓN

**Estado Actual:** 
- ⚠️ Funcional pero con aislamiento incompleto
- ✅ API route valida `organization_id` (seguridad a nivel aplicación)
- ❌ Storage no tiene aislamiento explícito por `organization_id`

**Recomendación:**
- ✅ Implementar path con `organization_id` (Opción 1)
- ✅ Agregar políticas RLS en Storage (Opción 2)
- ✅ Mantener validación en API route (ya existe)

**Prioridad:** Media-Alta (mejora seguridad y organización)

