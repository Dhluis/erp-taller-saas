# 🔍 DIAGNÓSTICO DE CONEXIÓN SUPABASE

## 📋 RESUMEN EJECUTIVO

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Estado:** ⚠️ REQUIERE ACCIÓN

---

## ✅ PASO 1: Variables de Entorno

### Verificación de Archivo .env.local
- **Estado:** ✅ Archivo existe
- **Ubicación:** `.env.local`

### Variables Requeridas

| Variable | Estado | Valor (Preview) |
|----------|--------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ Verificar | `https://igshgleciwknpupbmvhn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ Verificar | `eyJ...` (JWT token) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Opcional | `eyJ...` (JWT token) |

### ⚠️ ACCIONES REQUERIDAS

1. **Verificar que las variables existan en `.env.local`:**
   ```bash
   # En Windows PowerShell
   Get-Content .env.local | Select-String "NEXT_PUBLIC_SUPABASE"
   ```

2. **Verificar que la URL coincida con el error:**
   - Error menciona: `igshgleciwknpupbmvhn.supabase.co`
   - Debe ser: `https://igshgleciwknpupbmvhn.supabase.co`

3. **Verificar formato de las keys:**
   - Deben empezar con `eyJ` (JWT tokens)
   - No deben tener espacios o saltos de línea

---

## ✅ PASO 2: Cliente de Supabase

### Archivo: `src/lib/supabase/client.ts`

**Estado:** ✅ MEJORADO

### Mejoras Aplicadas:

1. ✅ **Validación de variables de entorno**
   - Verifica que existan antes de crear el cliente
   - Mensajes de error descriptivos

2. ✅ **Timeout de 10 segundos**
   - Previene conexiones colgadas
   - Manejo de errores de timeout

3. ✅ **Manejo de errores de conexión**
   - Detecta `ERR_CONNECTION_CLOSED`
   - Detecta `Failed to fetch`
   - Detecta `NetworkError`

4. ✅ **Retry automático en test de conexión**
   - 3 intentos con backoff exponencial
   - Timeout de 5 segundos por intento

5. ✅ **Logging mejorado**
   - Mensajes claros de éxito/error
   - Preview de URL (sin exponer keys completas)

---

## ✅ PASO 3: Middleware

### Archivo: `src/middleware.ts`

**Estado:** ✅ NO BLOQUEA RUTAS

El middleware actual:
- ✅ Permite todas las rutas públicas
- ✅ No bloquea si hay errores
- ✅ Maneja excepciones correctamente

**Nota:** El middleware no está usando Supabase actualmente, lo cual es correcto para evitar bloqueos.

---

## ✅ PASO 4: Script de Diagnóstico

### Archivo: `scripts/diagnose-supabase.js`

**Estado:** ✅ CREADO

### Uso:
```bash
node scripts/diagnose-supabase.js
```

### Qué hace:
1. Verifica variables de entorno
2. Valida formato de URL y keys
3. Prueba conexión real a Supabase
4. Muestra errores y sugerencias

---

## 🔧 FIXES APLICADOS

### 1. Cliente de Supabase Mejorado (`src/lib/supabase/client.ts`)

```typescript
// ✅ Timeout de 10 segundos
fetch: async (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 10000)
  
  // Manejo de errores específicos
  // Retry logic
  // Logging mejorado
}
```

### 2. Test de Conexión con Retry

```typescript
// ✅ 3 intentos con backoff
// ✅ Timeout de 5 segundos por intento
// ✅ Detección de errores de red
```

### 3. Validación de Configuración

```typescript
// ✅ Verifica que URL contenga "supabase.co"
// ✅ Verifica que keys sean JWT válidos
// ✅ Mensajes de error descriptivos
```

---

## 📝 PRÓXIMOS PASOS

### 1. Ejecutar Diagnóstico
```bash
node scripts/diagnose-supabase.js
```

### 2. Verificar Variables de Entorno
```bash
# Verificar que existan
Get-Content .env.local

# Verificar formato
# NEXT_PUBLIC_SUPABASE_URL debe ser: https://igshgleciwknpupbmvhn.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY debe empezar con: eyJ
```

### 3. Verificar Estado del Proyecto Supabase
- Ir a: https://supabase.com/dashboard/project/igshgleciwknpupbmvhn
- Verificar que el proyecto esté **ACTIVO** (no pausado)
- Verificar que no haya errores en el dashboard
- Verificar que el plan gratuito no haya excedido límites

### 4. Limpiar Cache y Reiniciar
```bash
# Limpiar cache de Next.js
Remove-Item -Recurse -Force .next

# Reinstalar dependencias (opcional)
npm install

# Reiniciar servidor
npm run dev
```

### 5. Probar Conexión en el Navegador
1. Abrir DevTools (F12)
2. Ir a la pestaña Network
3. Intentar iniciar sesión
4. Verificar errores en la consola
5. Verificar requests a Supabase

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### Error: `ERR_CONNECTION_CLOSED`

**Causas posibles:**
1. Proyecto Supabase pausado
2. URL incorrecta
3. Problemas de red/firewall
4. Límites del plan gratuito excedidos

**Soluciones:**
1. Verificar estado del proyecto en dashboard
2. Verificar que la URL sea correcta
3. Probar desde otro navegador/red
4. Verificar logs en Supabase dashboard

### Error: `Failed to fetch`

**Causas posibles:**
1. CORS issues
2. Problemas de red
3. Timeout

**Soluciones:**
1. Verificar configuración de CORS en Supabase
2. Verificar conexión a internet
3. Aumentar timeout (ya aplicado: 10s)

### Error: Variables de entorno no encontradas

**Causas posibles:**
1. Archivo `.env.local` no existe
2. Variables mal escritas
3. Archivo en ubicación incorrecta

**Soluciones:**
1. Crear `.env.local` en la raíz del proyecto
2. Copiar desde `env.example`
3. Verificar que las variables empiecen con `NEXT_PUBLIC_` para variables del cliente

---

## 📊 ESTADO FINAL

| Componente | Estado | Acción Requerida |
|------------|--------|------------------|
| Variables de Entorno | ⚠️ Verificar | Ejecutar diagnóstico |
| Cliente Supabase | ✅ Mejorado | Ninguna |
| Middleware | ✅ OK | Ninguna |
| Script Diagnóstico | ✅ Creado | Ejecutar |
| Test de Conexión | ⚠️ Pendiente | Ejecutar diagnóstico |

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] URL coincide con el proyecto (`igshgleciwknpupbmvhn`)
- [ ] Keys tienen formato JWT válido (`eyJ...`)
- [ ] Proyecto Supabase está activo (no pausado)
- [ ] Script de diagnóstico ejecutado
- [ ] Conexión probada en el navegador
- [ ] Cache de Next.js limpiado
- [ ] Servidor reiniciado

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

