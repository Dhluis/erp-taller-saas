# 📞 Script para Normalizar Números de Teléfono

Este script normaliza números de teléfono al formato estándar `52XXXXXXXXXX` (12 dígitos) en las tablas de WhatsApp.

## 🚀 Opciones para Ejecutar

### Opción 1: Supabase SQL Editor (RECOMENDADO - Más Fácil)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Crea una nueva query
5. Copia y pega el contenido de `supabase/migrations/026_normalize_phone_numbers.sql`
6. Haz clic en **Run** (o presiona `Ctrl+Enter`)

✅ **Ventaja:** No requiere configuración adicional, funciona inmediatamente

---

### Opción 2: Supabase CLI (Requiere Autenticación)

**Paso 1:** Autenticarte con Supabase
```bash
supabase login
```

**Paso 2:** Vincular tu proyecto
```bash
supabase link --project-ref tu-project-ref
```

**Paso 3:** Ejecutar la migración
```bash
supabase db push
```

**Nota:** `db push` solo funciona para migraciones nuevas. Si ya ejecutaste la migración antes, necesitarás usar otra opción.

---

### Opción 3: psql directamente (Requiere PostgreSQL Client)

**Paso 1:** Obtener la Connection String
1. Ve a Supabase Dashboard > Settings > Database
2. Copia la **Connection string** (Session mode o Transaction mode)

**Paso 2:** Instalar PostgreSQL Client (si no lo tienes)
```bash
# Windows (con Chocolatey)
choco install postgresql

# O descargar desde: https://www.postgresql.org/download/windows/
```

**Paso 3:** Ejecutar el SQL
```bash
psql "tu-connection-string" < supabase/migrations/026_normalize_phone_numbers.sql
```

---

## 📋 ¿Qué hace el script?

1. ✅ Crea función `clean_phone_number()` para normalizar números
2. ✅ Actualiza `whatsapp_conversations.customer_phone`
3. ✅ Actualiza `whatsapp_messages.from_number` y `to_number`
4. ✅ Actualiza `leads.phone` (solo si `lead_source = 'whatsapp'`)
5. ✅ Incluye queries de verificación antes y después

## ⚠️ Notas Importantes

- El script solo actualiza números que necesitan normalización
- La función `clean_phone_number()` se queda en la BD (puede eliminarse después si quieres)
- El script es seguro: solo modifica números, no elimina datos
- Incluye queries de verificación para comprobar el resultado

## 📄 Archivo

El script está en: `supabase/migrations/026_normalize_phone_numbers.sql`
