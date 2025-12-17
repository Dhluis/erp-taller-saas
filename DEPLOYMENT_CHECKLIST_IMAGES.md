# ✅ Checklist de Deployment: Sistema de Imágenes Multi-Tenant

## 📋 Pre-Deployment

### **Código (✅ COMPLETADO)**
- [x] Modificar `uploadWorkOrderImage` para obtener `organization_id`
- [x] Cambiar path de Storage para incluir `organization_id`
- [x] Actualizar API route DELETE para manejar nuevo path
- [x] Crear políticas RLS en Storage (SQL)
- [x] Documentación completa

---

## 🚀 Deployment

### **1. Ejecutar SQL en Supabase (REQUERIDO)**

**Pasos:**
1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Abrir archivo: `supabase-storage-multitenant-policies.sql`
3. Copiar y pegar el contenido completo
4. Ejecutar el SQL
5. Verificar que no hay errores

**Verificación:**
```sql
-- Verificar que las políticas se crearon
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%organization%'
ORDER BY policyname;
```

**Resultado esperado:** 4 políticas (SELECT, INSERT, DELETE, UPDATE)

---

### **2. Verificar Funciones Helper**

```sql
-- Verificar función get_user_organization_id
SELECT storage.get_user_organization_id();

-- Verificar función extract_organization_id_from_path
SELECT storage.extract_organization_id_from_path('org-123/order-456/file.jpg');
-- Debe retornar: 'org-123'
```

---

## 🧪 Testing Post-Deployment

### **Test 1: Subida de Imagen Nueva**
1. Crear una nueva orden de trabajo
2. Subir una imagen
3. Verificar en Supabase Storage que el path es: `{organizationId}/{orderId}/{filename}`
4. Verificar que la imagen se muestra correctamente

### **Test 2: Validación Multi-Tenant**
1. Usuario de Organización A sube imagen
2. Usuario de Organización B intenta acceder a la misma imagen
3. **Resultado esperado:** Debe ser rechazado por políticas RLS

### **Test 3: Eliminación**
1. Eliminar una imagen desde la UI
2. Verificar que se elimina de Storage
3. Verificar que se elimina de la BD

### **Test 4: Imágenes Antiguas**
1. Intentar acceder a una imagen antigua (sin `organization_id` en path)
2. **Resultado esperado:** Puede funcionar si se accede directamente, pero las políticas RLS la rechazarán

---

## 📊 Monitoreo

### **Logs a Revisar:**
- ✅ Verificar que no hay errores al subir imágenes
- ✅ Verificar que los paths se generan correctamente con `organization_id`
- ✅ Verificar que las políticas RLS funcionan (rechazan accesos no autorizados)

### **Métricas:**
- Tiempo de subida de imágenes (no debe aumentar significativamente)
- Errores de Storage (debe ser 0)
- Accesos rechazados por políticas RLS (debe ser > 0 si hay intentos no autorizados)

---

## ⚠️ Notas Importantes

### **Imágenes Existentes:**
- ✅ **Decisión:** Dejar imágenes antiguas como están
- ⚠️ Las imágenes antiguas (sin `organization_id` en path) seguirán funcionando si se acceden directamente
- ⚠️ Las políticas RLS las rechazarán (seguridad por defecto)
- ✅ Las nuevas imágenes siempre tendrán `organization_id` en el path

### **Rollback (si es necesario):**
Si hay problemas, se puede revertir ejecutando:
```sql
-- Eliminar políticas nuevas
DROP POLICY IF EXISTS "Users can only read their organization images" ON storage.objects;
DROP POLICY IF EXISTS "Users can only upload to their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can only delete their organization images" ON storage.objects;
DROP POLICY IF EXISTS "Users can only update their organization images" ON storage.objects;

-- Restaurar políticas antiguas (si es necesario)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING (bucket_id = 'work-order-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-images' 
  AND auth.role() = 'authenticated'
);
```

---

## ✅ Estado Final

- **Código:** ✅ Listo para producción
- **SQL:** ⏳ Pendiente de ejecutar en Supabase
- **Testing:** ⏳ Pendiente después de ejecutar SQL
- **Documentación:** ✅ Completa

---

## 🎯 Próximos Pasos

1. **Ejecutar SQL en Supabase** (REQUERIDO)
2. **Probar subida de imagen nueva**
3. **Verificar que el path incluye `organization_id`**
4. **Monitorear logs por 24-48 horas**
5. **Confirmar que todo funciona correctamente**

---

## 📝 Contacto

Si hay problemas durante el deployment:
1. Revisar logs de Supabase
2. Verificar que las políticas RLS se crearon correctamente
3. Verificar que las funciones helper funcionan
4. Revisar documentación en `MULTITENANT_IMAGES_IMPLEMENTATION.md`

