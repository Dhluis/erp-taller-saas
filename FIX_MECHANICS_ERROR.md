# 🔧 **SOLUCIÓN: ERROR AL CREAR MECÁNICO**

---

## ❌ **PROBLEMA IDENTIFICADO**

### **Error:**
```
❌ [CreateMechanic] Error: {}
```

### **Causa Probable:**
La tabla `users` probablemente **NO tiene los campos** necesarios:
- ❌ `specialties` (TEXT[])
- ❌ `is_active` (BOOLEAN)
- ❌ `organization_id` (UUID)

---

## 🔍 **DIAGNÓSTICO**

### **Paso 1: Verificar Estructura de la Tabla**

Ejecuta en **Supabase SQL Editor**:

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

### **Paso 2: Buscar Campos Específicos**

```sql
-- Verificar si existe specialties
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'specialties';

-- Verificar si existe is_active
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'is_active';

-- Verificar si existe organization_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'organization_id';
```

---

## ✅ **SOLUCIÓN RÁPIDA**

### **Ejecuta este SQL en Supabase:**

```sql
-- 1. Agregar campo specialties (array de texto)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- 2. Agregar campo is_active
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Agregar campo organization_id si no existe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 4. Agregar foreign key para organization_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Actualizar registros existentes con organization_id
UPDATE users u
SET organization_id = w.organization_id
FROM workshops w
WHERE u.workshop_id = w.id
  AND u.organization_id IS NULL;

-- 6. Actualizar registros existentes con is_active = true
UPDATE users 
SET is_active = true 
WHERE is_active IS NULL;

-- 7. Verificar que los cambios se aplicaron
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('specialties', 'is_active', 'organization_id')
ORDER BY column_name;

-- 8. Ver los datos actualizados
SELECT 
    id,
    name,
    email,
    role,
    specialties,
    is_active,
    organization_id,
    workshop_id
FROM users
LIMIT 5;
```

---

## 🔄 **DESPUÉS DE EJECUTAR EL SQL**

### **1. Prueba Crear un Mecánico:**
```
1. Navega a http://localhost:3000/mecanicos
2. Clic en "Nuevo Mecánico"
3. Llena el formulario:
   - Nombre: Juan Pérez
   - Email: juan@ejemplo.com
   - Teléfono: 222-123-4567
   - Rol: Mecánico
   - Especialidades: Frenos, Motor
4. Clic en "Crear Mecánico"
5. Ver logs en consola
```

### **2. Logs Esperados (Éxito):**
```
🚀 [CreateMechanic] Iniciando creación...
🔍 [CreateMechanic] Workshop ID: 042ab6bd-8979-4166-882a-c244b5e51e51
🔍 [CreateMechanic] Obteniendo organization_id...
📊 [CreateMechanic] Workshop data: { organization_id: '...' }
📊 [CreateMechanic] Workshop error: null
📝 [CreateMechanic] Especialidades procesadas: ['Frenos', 'Motor']
📋 [CreateMechanic] Datos a insertar: { ... }
➕ [CreateMechanic] Insertando en tabla users...
📊 [CreateMechanic] Resultado insert: { newMechanic: {...}, mechanicError: null }
✅ [CreateMechanic] Mecánico creado exitosamente: [id]
🏁 [CreateMechanic] Proceso finalizado
```

### **3. Logs Esperados (Error):**
```
🚀 [CreateMechanic] Iniciando creación...
🔍 [CreateMechanic] Workshop ID: 042ab6bd-8979-4166-882a-c244b5e51e51
🔍 [CreateMechanic] Obteniendo organization_id...
📊 [CreateMechanic] Workshop data: { organization_id: '...' }
📊 [CreateMechanic] Workshop error: null
📝 [CreateMechanic] Especialidades procesadas: ['Frenos', 'Motor']
📋 [CreateMechanic] Datos a insertar: { ... }
➕ [CreateMechanic] Insertando en tabla users...
📊 [CreateMechanic] Resultado insert: { newMechanic: null, mechanicError: {...} }
❌ [CreateMechanic] Error de Supabase: {...}
❌ [CreateMechanic] Error code: "42703"
❌ [CreateMechanic] Error message: "column specialties does not exist"
❌ [CreateMechanic] Error details: ...
❌ [CreateMechanic] Error hint: ...
🏁 [CreateMechanic] Proceso finalizado
```

---

## 🗄️ **ESTRUCTURA ESPERADA DE LA TABLA USERS**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL,
    specialties TEXT[],  -- Array de especialidades
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎯 **CHECKLIST DE VERIFICACIÓN**

Después de ejecutar el SQL, verifica:

- [ ] Campo `specialties` existe en `users`
- [ ] Campo `is_active` existe en `users`
- [ ] Campo `organization_id` existe en `users`
- [ ] Foreign key `users_organization_id_fkey` existe
- [ ] Registros existentes tienen `is_active = true`
- [ ] Registros existentes tienen `organization_id` poblado

---

## 📊 **ALTERNATIVA: CREAR TABLA EMPLOYEES**

Si prefieres tener una tabla separada para empleados:

```sql
-- Crear tabla employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'mechanic',
    specialties TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar índices
CREATE INDEX idx_employees_workshop ON employees(workshop_id);
CREATE INDEX idx_employees_organization ON employees(organization_id);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_is_active ON employees(is_active);

-- Agregar RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Política de lectura
CREATE POLICY "Users can view employees from their workshop"
ON employees FOR SELECT
USING (
    workshop_id IN (
        SELECT workshop_id 
        FROM users 
        WHERE auth_user_id = auth.uid()
    )
);

-- Política de inserción
CREATE POLICY "Users can create employees in their workshop"
ON employees FOR INSERT
WITH CHECK (
    workshop_id IN (
        SELECT workshop_id 
        FROM users 
        WHERE auth_user_id = auth.uid()
    )
);

-- Política de actualización
CREATE POLICY "Users can update employees from their workshop"
ON employees FOR UPDATE
USING (
    workshop_id IN (
        SELECT workshop_id 
        FROM users 
        WHERE auth_user_id = auth.uid()
    )
);
```

Si usas tabla `employees`, actualiza el código:

```typescript
// En src/app/mecanicos/page.tsx
const { data, error } = await supabase
  .from('employees')  // Cambiar de 'users' a 'employees'
  .select('*')
  .eq('workshop_id', profile.workshop_id)
  .order('name')

// En src/components/mecanicos/CreateMechanicModal.tsx
const { data: newMechanic, error: mechanicError } = await supabase
  .from('employees')  // Cambiar de 'users' a 'employees'
  .insert(mechanicData)
  .select()
  .single()
```

---

## 🚀 **SIGUIENTE PASO**

1. **Ejecuta el SQL** en Supabase (opción 1 o 2)
2. **Verifica los cambios** con las queries de verificación
3. **Recarga la página** `/mecanicos`
4. **Revisa los logs** en la consola del navegador
5. **Intenta crear** un mecánico nuevamente

---

**Fecha:** ${new Date().toLocaleString()}  
**Estado:** 🔍 **DEBUGGING MEJORADO**  
**Acción:** ✅ **EJECUTA EL SQL EN SUPABASE**

---

## 📝 **RESUMEN**

El error ocurre porque la tabla `users` no tiene los campos:
- `specialties`
- `is_active`
- `organization_id` (posiblemente)

**Solución:** Ejecutar el SQL proporcionado para agregar estos campos.

**¡Ejecuta el SQL y prueba nuevamente!** 🚀



