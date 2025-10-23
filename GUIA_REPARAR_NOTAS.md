# 🔧 GUÍA COMPLETA PARA REPARAR SISTEMA DE NOTAS

## 📋 PROBLEMA
Las notas no se guardan en la base de datos

---

## ✅ PASO 1: VERIFICAR COLUMNA EN SUPABASE

### 1.1 Ve a Supabase → SQL Editor

### 1.2 Ejecuta esta query:
```sql
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'notes';
```

### 1.3 Interpreta el resultado:

**CASO A: No aparece ningún resultado**
- ❌ La columna NO existe
- ✅ Solución: Ejecuta esto:
```sql
ALTER TABLE work_orders 
ADD COLUMN notes jsonb DEFAULT '[]'::jsonb;

CREATE INDEX idx_work_orders_notes ON work_orders USING gin(notes);
```

**CASO B: Aparece pero `data_type` es `text`**
- ❌ La columna existe pero es del tipo incorrecto
- ✅ Solución: Ejecuta esto:
```sql
ALTER TABLE work_orders 
ALTER COLUMN notes TYPE jsonb USING notes::jsonb;

ALTER TABLE work_orders 
ALTER COLUMN notes SET DEFAULT '[]'::jsonb;
```

**CASO C: Aparece y `data_type` es `jsonb`**
- ✅ La columna está bien configurada
- Continúa al Paso 2

---

## ✅ PASO 2: PROBAR AGREGAR NOTA MANUALMENTE

### 2.1 Obtener ID de una orden
```sql
SELECT id, status, created_at
FROM work_orders 
ORDER BY created_at DESC 
LIMIT 5;
```

### 2.2 Copiar un `id` y usarlo en este script:
```sql
-- Reemplaza 'TU-ORDER-ID-AQUI' con el ID real
UPDATE work_orders 
SET notes = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'text', 'Nota de prueba',
    'createdAt', now()::text,
    'createdBy', 'test',
    'userName', 'Test User',
    'isPinned', false,
    'category', 'general'
  )
)
WHERE id = 'TU-ORDER-ID-AQUI';
```

### 2.3 Verificar que se guardó:
```sql
SELECT id, notes 
FROM work_orders 
WHERE id = 'TU-ORDER-ID-AQUI';
```

**¿Funcionó?**
- ✅ SÍ → La BD está bien, el problema es en el código
- ❌ NO → Hay un problema con permisos o RLS

---

## ✅ PASO 3: VERIFICAR PERMISOS RLS

### 3.1 Ver políticas actuales:
```sql
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'work_orders';
```

### 3.2 Verificar que existe una política UPDATE

**Si NO hay política UPDATE o está muy restrictiva:**
```sql
-- Crear política básica para UPDATE (ajusta según tu lógica de RLS)
CREATE POLICY "Users can update their work orders"
ON work_orders
FOR UPDATE
USING (organization_id = auth.jwt() ->> 'organization_id')
WITH CHECK (organization_id = auth.jwt() ->> 'organization_id');
```

---

## ✅ PASO 4: DEBUGGING EN LA APLICACIÓN

### 4.1 Recarga la app:
```
Ctrl + Shift + R
```

### 4.2 Abre Consola del Navegador:
```
F12 → Pestaña Console
```

### 4.3 Limpia la consola:
- Click en el icono 🚫 o escribe `clear()`

### 4.4 Intenta agregar una nota

### 4.5 Copia TODOS los logs que aparezcan

Deberías ver algo como:
```
🎯 [handleAddNote] Iniciando...
📝 Texto: Mi nota de prueba
🏷️ Categoría: general
👤 Usuario: { userId: '...', userName: '...' }
🔄 [handleAddNote] Estado: adding = true
📡 [handleAddNote] Llamando a addNoteToWorkOrder...
1️⃣ [addNote] Iniciando...
2️⃣ [addNote] Nota creada: { id: '...', text: '...', ... }
3️⃣ [addNote] Obteniendo orden actual...
4️⃣ [addNote] Orden obtenida: { notes: [...] }
5️⃣ [addNote] Notas actuales: [...]
6️⃣ [addNote] Notas actualizadas (total): X
7️⃣ [addNote] Actualizando orden en BD...
✅ [addNote] Nota agregada exitosamente
```

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### ERROR 1: "column 'notes' does not exist"
```
❌ Error: column "notes" of relation "work_orders" does not exist
```
**Solución:** Ejecuta el ALTER TABLE del Paso 1.1

---

### ERROR 2: "permission denied for table work_orders"
```
❌ Error: permission denied for relation work_orders
```
**Solución:** 
1. Verifica que estás autenticado
2. Revisa las políticas RLS (Paso 3)

---

### ERROR 3: Se queda en "Agregando..." eternamente
```
🔄 [handleAddNote] Estado: adding = true
... (no hay más logs)
```
**Posibles causas:**
1. El cliente de Supabase no está inicializado
2. No hay conexión de red
3. Las credenciales están mal

**Solución:**
```typescript
// En src/lib/supabase/client.ts, verifica:
export const createClient = () => {
  return createClientPrimitive(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

### ERROR 4: userId o userName son undefined
```
👤 Usuario: { userId: undefined, userName: undefined }
```
**Solución:** El problema está en cómo se pasa el `userId` desde arriba.

Verifica en `src/components/ordenes/KanbanBoard.tsx` (o donde se abre el modal):
```typescript
<WorkOrderDetailsModal
  order={selectedOrder}
  open={isModalOpen}
  onOpenChange={setIsModalOpen}
  userId={userId} // ← DEBE estar presente
  onUpdate={loadOrders}
/>
```

Para obtener el userId, agrega al inicio del componente:
```typescript
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Dentro del componente:
const [userId, setUserId] = useState<string>()

useEffect(() => {
  const supabase = createClient()
  supabase.auth.getUser().then(({ data }) => {
    setUserId(data.user?.id)
  })
}, [])
```

---

### ERROR 5: "notes is not iterable"
```
❌ TypeError: notes is not iterable
```
**Solución:** La columna `notes` es `text` en vez de `jsonb`.
Ejecuta la conversión del Paso 1.2 (CASO B).

---

## ✅ PASO 5: VERIFICACIÓN FINAL

### 5.1 Agrega una nota desde la app

### 5.2 Ve a Supabase → Table Editor → work_orders

### 5.3 Busca la orden y verifica la columna `notes`

**Debería verse así:**
```json
[
  {
    "id": "uuid-...",
    "text": "Mi nota de prueba",
    "createdAt": "2024-10-18T...",
    "createdBy": "user-id",
    "userName": "Juan Pérez",
    "isPinned": false,
    "category": "general"
  }
]
```

---

## 📊 SCRIPT DE DIAGNÓSTICO COMPLETO

Ejecuta esto en Supabase SQL Editor:

```sql
-- 1. Verificar columna
SELECT 
  'Columna notes' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'work_orders' 
      AND column_name = 'notes'
      AND data_type = 'jsonb'
    ) THEN '✅ OK'
    ELSE '❌ FALTA O TIPO INCORRECTO'
  END as estado;

-- 2. Verificar índice
SELECT 
  'Índice notes' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE tablename = 'work_orders' 
      AND indexname LIKE '%notes%'
    ) THEN '✅ OK'
    ELSE '⚠️ SIN ÍNDICE (opcional)'
  END as estado;

-- 3. Contar órdenes con notas
SELECT 
  'Órdenes con notas' as verificacion,
  COUNT(*) as total
FROM work_orders 
WHERE notes IS NOT NULL 
  AND jsonb_array_length(notes) > 0;

-- 4. Ver últimas notas
SELECT 
  id,
  status,
  jsonb_array_length(COALESCE(notes, '[]'::jsonb)) as num_notas,
  notes->0->>'text' as ultima_nota
FROM work_orders 
ORDER BY updated_at DESC 
LIMIT 5;
```

---

## 🎯 CHECKLIST FINAL

- [ ] ✅ Columna `notes` existe y es tipo `jsonb`
- [ ] ✅ Puedo agregar nota manualmente con SQL
- [ ] ✅ Políticas RLS permiten UPDATE
- [ ] ✅ `userId` y `userName` llegan al componente
- [ ] ✅ Veo logs completos en consola
- [ ] ✅ No hay errores en consola
- [ ] ✅ La nota aparece en Supabase después de agregarla

---

## 📞 SI SIGUES CON PROBLEMAS

Envíame:
1. Screenshot de la consola del navegador (F12)
2. Resultado del "Script de diagnóstico completo"
3. Código de cómo llamas a `WorkOrderDetailsModal`

¡Y lo arreglamos juntos! 🚀





