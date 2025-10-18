# 🔧 **FIX RÁPIDO: Error 500 en /api/orders/stats**

---

## ❌ **PROBLEMA**

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

---

## 🔍 **CAUSA PROBABLE**

La tabla `workshops` en Supabase **NO tiene la columna `organization_id`** todavía.

El código intenta hacer:
```typescript
const { data: workshop } = await supabase
  .from('workshops')
  .select('id, organization_id')  // ← Esta columna no existe
  .eq('id', userProfile.workshop_id)
  .single()
```

---

## ✅ **SOLUCIÓN INMEDIATA**

### **Opción 1: Ejecutar SQL en Supabase (Recomendado)**

1. **Abre Supabase Dashboard:** https://supabase.com/dashboard
2. **Ve a SQL Editor**
3. **Ejecuta este SQL:**

```sql
-- Agregar organization_id a workshops
ALTER TABLE workshops
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Asignar organization_id por defecto a workshops existentes
UPDATE workshops 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Verificar
SELECT id, name, organization_id FROM workshops;
```

4. **Refresca tu navegador**

---

### **Opción 2: Fix Temporal en el Código** ⚠️

Si no puedes acceder a Supabase ahora, puedes aplicar un fix temporal:

**Archivo:** `src/lib/core/multi-tenant-server.ts`

```typescript
// Línea 65-74, REEMPLAZAR:
const { data: workshop, error: workshopError } = await supabase
  .from('workshops')
  .select('id, organization_id')
  .eq('id', userProfile.workshop_id)
  .single()

if (workshopError || !workshop) {
  throw new Error('Workshop no encontrado')
}

// POR ESTO (temporal):
const { data: workshop, error: workshopError } = await supabase
  .from('workshops')
  .select('id')
  .eq('id', userProfile.workshop_id)
  .single()

if (workshopError || !workshop) {
  throw new Error('Workshop no encontrado')
}

// Hardcodear organization_id temporalmente
const organizationId = '00000000-0000-0000-0000-000000000001'
```

Y cambiar el return (línea 76-80):

```typescript
return {
  organizationId: organizationId, // ← Hardcodeado
  workshopId: workshop.id,
  userId: user.id
}
```

---

## 🚀 **VERIFICACIÓN**

Después del fix, abre:
```
http://localhost:3000/dashboard
```

Deberías ver:
- ✅ Dashboard carga sin error 500
- ✅ Estadísticas se muestran
- ✅ Gráficas funcionan

---

## 📊 **EXPLICACIÓN TÉCNICA**

### **Por qué ocurre:**

1. El sistema multi-tenant necesita `organization_id` en `workshops`
2. La migración SQL para agregar esta columna no se ha ejecutado
3. El código intenta leer una columna que no existe
4. Supabase retorna error → API retorna 500

### **Solución permanente:**

Ejecutar el SQL en Supabase Dashboard para agregar la columna `organization_id` a la tabla `workshops`.

---

## 🎯 **SIGUIENTE PASO**

**Ejecuta el SQL en Supabase:**

```sql
-- 1. Agregar columna
ALTER TABLE workshops
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2. Agregar foreign key
ALTER TABLE workshops
ADD CONSTRAINT workshops_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- 3. Actualizar registros existentes
UPDATE workshops 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 4. Hacer la columna obligatoria (opcional)
ALTER TABLE workshops
ALTER COLUMN organization_id SET NOT NULL;
```

---

## ✅ **RESULTADO ESPERADO**

Después del fix:
- ✅ Dashboard funciona
- ✅ API `/api/orders/stats` retorna 200
- ✅ Multi-tenant funcionando
- ✅ Modal de órdenes funciona

---

**¿Necesitas ayuda ejecutando el SQL?** Comparte los logs del terminal y te ayudo a identificar el error exacto.


