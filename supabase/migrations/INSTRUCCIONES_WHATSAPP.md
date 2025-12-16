# 🔧 Instrucciones: Fix columnas WhatsApp en ai_agent_config

## 🚨 **PROBLEMA**
```
Error: Could not find the 'whatsapp_phone' column of 'ai_agent_config' in the schema cache
```

## ✅ **SOLUCIÓN**

### **Opción 1: Ejecutar desde Supabase Dashboard (RECOMENDADO)**

1. **Abre tu proyecto en Supabase:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto: `erp-taller-saas`

2. **Abre el SQL Editor:**
   - En el menú lateral, click en **"SQL Editor"**
   - Click en **"New query"**

3. **Copia y pega esta migración:**

```sql
-- =====================================================
-- MIGRACIÓN: Fix WhatsApp columns en ai_agent_config
-- =====================================================

DO $$ 
BEGIN
    -- Agregar columna whatsapp_phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_phone'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_phone TEXT;
        
        RAISE NOTICE 'Columna whatsapp_phone agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna whatsapp_phone ya existe, omitiendo...';
    END IF;

    -- Agregar columna whatsapp_connected
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_connected'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_connected BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Columna whatsapp_connected agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna whatsapp_connected ya existe, omitiendo...';
    END IF;
END $$;

-- Agregar comentarios
COMMENT ON COLUMN public.ai_agent_config.whatsapp_phone IS 
    'Número de teléfono de WhatsApp Business vinculado';

COMMENT ON COLUMN public.ai_agent_config.whatsapp_connected IS 
    'Indica si el número de WhatsApp está conectado y activo';

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_whatsapp_phone 
ON public.ai_agent_config(whatsapp_phone) 
WHERE whatsapp_phone IS NOT NULL;
```

4. **Ejecuta la migración:**
   - Click en **"Run"** (o presiona `Ctrl+Enter`)
   - Deberías ver: ✅ `Success. No rows returned`

5. **Verifica que las columnas se agregaron:**
   - Ve a **"Table Editor"** en el menú lateral
   - Selecciona la tabla **`ai_agent_config`**
   - Deberías ver las nuevas columnas:
     - `whatsapp_phone` (text)
     - `whatsapp_connected` (boolean)

---

### **Opción 2: Ejecutar desde CLI de Supabase (Avanzado)**

Si tienes Supabase CLI instalado:

```bash
# 1. Ir al directorio del proyecto
cd C:\Users\exclu\erp-taller-saas

# 2. Aplicar migración
supabase db push

# 3. Verificar que se aplicó correctamente
supabase db diff
```

---

### **Opción 3: SQL Rápido (Solo agregar columnas)**

Si solo quieres agregar las columnas rápidamente:

```sql
-- Ejecuta esto en SQL Editor de Supabase
ALTER TABLE ai_agent_config 
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

ALTER TABLE ai_agent_config 
ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_ai_agent_config_whatsapp_phone 
ON ai_agent_config(whatsapp_phone);
```

---

## 🔍 **VERIFICACIÓN**

Después de ejecutar la migración, verifica que todo funcione:

1. **Consulta la tabla:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_agent_config' 
AND column_name IN ('whatsapp_phone', 'whatsapp_connected');
```

Deberías ver:
```
column_name          | data_type | is_nullable
---------------------|-----------|-----------
whatsapp_phone       | text      | YES
whatsapp_connected   | boolean   | YES
```

2. **Prueba guardar configuración:**
   - Ve a `/dashboard/whatsapp/train-agent`
   - Completa el wizard
   - Click en "Guardar"
   - ✅ Ya no debería dar el error

---

## 📝 **NOTAS ADICIONALES**

- **Es seguro ejecutar múltiples veces:** La migración usa `IF NOT EXISTS`, así que no dará error si las columnas ya existen.
- **No afecta datos existentes:** Solo agrega columnas nuevas.
- **Índice optimizado:** Se crea un índice parcial solo para filas con `whatsapp_phone` no nulo.

---

## 🆘 **SI PERSISTE EL ERROR**

Si después de ejecutar la migración sigues viendo el error:

1. **Refresca el schema cache de Supabase:**
   - En Supabase Dashboard, ve a **Settings** > **Database**
   - Busca **"Schema cache"** o **"Refresh schema"**
   - Click en **"Refresh"**

2. **Reinicia tu servidor Next.js:**
```bash
# Detener el servidor (Ctrl+C)
# Reiniciar
npm run dev
```

3. **Limpia caché del navegador:**
   - `Ctrl+Shift+R` (hard refresh)
   - O abre en modo incógnito

---

## ✅ **RESULTADO ESPERADO**

Después de aplicar la migración:
- ✅ `whatsapp_phone` columna disponible
- ✅ `whatsapp_connected` columna disponible
- ✅ Guardar configuración funciona
- ✅ Vincular WhatsApp funciona
- ✅ Bot puede recibir y responder mensajes

---

**Fecha de creación:** 2025-01-03  
**Última actualización:** 2025-01-03









