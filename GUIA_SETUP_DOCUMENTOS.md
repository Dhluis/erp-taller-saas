# 📄 GUÍA: Configuración de Documentos para Work Orders

## 🎯 Objetivo

Permitir subir, almacenar y gestionar documentos (PDFs, imágenes, Word, Excel) asociados a órdenes de trabajo.

---

## 📋 PASO 1: Ejecutar Script SQL

### Opción A: Desde Supabase Dashboard (RECOMENDADO)

1. Ve a tu proyecto en **Supabase Dashboard**
2. Click en **SQL Editor** (icono de base de datos en el menú lateral)
3. Click en **"New query"**
4. Copia y pega el contenido del archivo `setup-work-order-documents.sql`
5. Click en **"Run"** (o presiona `Ctrl + Enter`)
6. Espera a que termine (verás "Success" en verde)

### Opción B: Desde psql (Avanzado)

```bash
psql -h db.xxxxxx.supabase.co -U postgres -d postgres -f setup-work-order-documents.sql
```

---

## ✅ PASO 2: Verificar Columna `documents`

Ejecuta esta query en SQL Editor:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'documents';
```

**Resultado esperado:**

| column_name | data_type | column_default |
|-------------|-----------|----------------|
| documents   | jsonb     | '[]'::jsonb    |

---

## 🪣 PASO 3: Verificar Bucket en Storage

### Desde Supabase Dashboard:

1. Ve a **Storage** (icono de carpeta en el menú lateral)
2. Deberías ver el bucket **`work-order-documents`**
3. Click en el bucket
4. Verifica la configuración:
   - ✅ **Public bucket**: Activado
   - ✅ **File size limit**: 50 MB
   - ✅ **Allowed MIME types**: PDF, imágenes, Word, Excel

### Desde SQL Editor:

```sql
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'work-order-documents';
```

**Resultado esperado:**

- `public`: `true`
- `file_size_limit`: `52428800` (50 MB en bytes)
- `allowed_mime_types`: Array con PDFs, imágenes, Word, Excel

---

## 🔐 PASO 4: Verificar Políticas RLS

Ejecuta en SQL Editor:

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%work order documents%'
ORDER BY policyname;
```

**Deberías ver 4 políticas:**

1. **Public read access** → `SELECT` → `public`
2. **Authenticated users can upload** → `INSERT` → `authenticated`
3. **Authenticated users can update** → `UPDATE` → `authenticated`
4. **Authenticated users can delete** → `DELETE` → `authenticated`

---

## 🧪 PASO 5: Probar Manualmente

### 5.1 Probar subir archivo desde Supabase Dashboard:

1. Ve a **Storage** → **work-order-documents**
2. Click en **"Upload file"**
3. Sube un PDF de prueba
4. Verifica que se subió correctamente
5. Click en el archivo → **"Copy URL"**
6. Pega la URL en el navegador para verificar que es público

### 5.2 Probar agregar documento a una orden:

Ejecuta en SQL Editor (reemplaza `ORDER_ID` con un ID real):

```sql
UPDATE work_orders
SET documents = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', 'documento-prueba.pdf',
    'url', 'https://tu-proyecto.supabase.co/storage/v1/object/public/work-order-documents/test.pdf',
    'type', 'application/pdf',
    'category', 'invoice',
    'size', 150000,
    'uploaded_by', 'admin',
    'uploaded_at', NOW()::text
  )
)
WHERE id = 'ORDER_ID';
```

### 5.3 Verificar que se guardó:

```sql
SELECT id, documents
FROM work_orders
WHERE id = 'ORDER_ID';
```

---

## 📊 ESTRUCTURA DEL CAMPO `documents`

El campo `documents` es un array JSON con esta estructura:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "factura-123.pdf",
    "url": "https://xxx.supabase.co/storage/v1/object/public/work-order-documents/orden-123/factura-123.pdf",
    "type": "application/pdf",
    "category": "invoice",
    "size": 245000,
    "uploaded_by": "user-id",
    "uploaded_at": "2024-10-18T10:30:00.000Z"
  }
]
```

### Categorías de documentos:

- `invoice` - Facturas
- `quote` - Cotizaciones
- `warranty` - Garantías
- `receipt` - Recibos
- `contract` - Contratos
- `photo` - Fotos adicionales
- `report` - Reportes
- `other` - Otros

---

## 🎨 TIPOS DE ARCHIVO PERMITIDOS

| Tipo | MIME Type | Extensión |
|------|-----------|-----------|
| PDF | `application/pdf` | `.pdf` |
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` |
| PNG | `image/png` | `.png` |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` |
| Word (antiguo) | `application/msword` | `.doc` |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |
| Excel (antiguo) | `application/vnd.ms-excel` | `.xls` |
| Texto | `text/plain` | `.txt` |

**Tamaño máximo:** 50 MB por archivo

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### Error: "Bucket already exists"

**Causa:** El bucket ya fue creado anteriormente.

**Solución:** El script usa `ON CONFLICT DO UPDATE`, así que simplemente actualizará la configuración. No hay problema.

### Error: "Permission denied for table storage.buckets"

**Causa:** No tienes permisos suficientes.

**Solución:** Asegúrate de estar usando el usuario `postgres` en Supabase.

### Error al subir archivo: "New row violates row-level security policy"

**Causa:** Las políticas RLS no están configuradas correctamente.

**Solución:** 
1. Verifica que las 4 políticas existen (PASO 4)
2. Re-ejecuta la sección de políticas del script

### Los archivos no son accesibles públicamente

**Causa:** El bucket no está marcado como público.

**Solución:**
```sql
UPDATE storage.buckets
SET public = true
WHERE id = 'work-order-documents';
```

---

## ✅ CHECKLIST FINAL

Antes de continuar con la implementación del código, verifica:

- [ ] ✅ Columna `documents` existe en `work_orders`
- [ ] ✅ Bucket `work-order-documents` creado
- [ ] ✅ Bucket es público (`public = true`)
- [ ] ✅ 4 políticas RLS creadas
- [ ] ✅ Puedes subir un archivo de prueba
- [ ] ✅ El archivo es accesible públicamente
- [ ] ✅ Puedes agregar un documento al campo `documents`

---

## 🚀 SIGUIENTE PASO

Una vez completado este setup, estarás listo para implementar:

1. **Componente de subida de documentos** (`WorkOrderDocuments.tsx`)
2. **Funciones de gestión de documentos** (`work-order-documents.ts`)
3. **Integración en el modal de detalles de orden**
4. **Tab "Documentos" en `WorkOrderDetailsTabs`**

---

## 📞 AYUDA

Si algo no funciona:

1. Revisa los logs en **Supabase Dashboard → Logs**
2. Verifica las políticas RLS en **Database → Policies**
3. Prueba subir un archivo manualmente desde **Storage**
4. Ejecuta las queries de verificación del PASO 2-4

---

**✅ Setup completado exitosamente**

Tu base de datos ya está lista para gestionar documentos en las órdenes de trabajo.







