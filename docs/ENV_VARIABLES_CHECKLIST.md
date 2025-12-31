# 🔐 CHECKLIST COMPLETO DE VARIABLES DE ENTORNO

**Fecha:** Enero 2025  
**Proyecto:** Eagles ERP - Taller SaaS  
**Propósito:** Verificar que TODAS las variables de entorno estén configuradas correctamente en Vercel

---

## 📋 TABLA RESUMEN

| Categoría | Variables | Críticas | Opcionales |
|-----------|-----------|----------|------------|
| **Supabase** | 3 | 3 | 0 |
| **WAHA (WhatsApp)** | 2 | 2* | 0 |
| **AI Agent** | 2 | 1** | 1 |
| **Upstash (Rate Limiting)** | 2 | 2 | 0 |
| **App URL** | 1 | 1 | 0 |
| **Debug/Opcional** | 2 | 0 | 2 |
| **TOTAL** | **12** | **9** | **3** |

\* WAHA puede configurarse en BD como fallback  
\** OpenAI o Anthropic (al menos uno requerido)

---

## 1️⃣ SUPABASE (Auth y Database)

### ✅ **CRÍTICAS - OBLIGATORIAS**

#### 1. `NEXT_PUBLIC_SUPABASE_URL`
- **Nombre exacto:** `NEXT_PUBLIC_SUPABASE_URL`
- **Formato:** `https://xxxxx.supabase.co`
- **Dónde se usa:**
  - `src/lib/supabase/client.ts` - Cliente browser
  - `src/lib/supabase/server.ts` - Cliente servidor
  - `src/lib/auth/client-auth.ts` - Autenticación
  - `src/app/auth/callback/route.ts` - OAuth callback
  - `src/app/auth/register/page.tsx` - Registro
  - `src/components/auth/OAuthButtons.tsx` - Botones OAuth
- **Crítica:** ✅ **SÍ** - Sin esto no funciona autenticación ni base de datos
- **Ejemplo:** `https://igshgleciwknpupbmvhn.supabase.co`

#### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Nombre exacto:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Formato:** JWT token que empieza con `eyJ...`
- **Dónde se usa:**
  - `src/lib/supabase/client.ts` - Cliente browser
  - `src/lib/supabase/server.ts` - Cliente servidor
  - `src/lib/auth/client-auth.ts` - Autenticación
  - `src/app/auth/callback/route.ts` - OAuth callback
  - `src/app/auth/register/page.tsx` - Registro
  - `src/components/auth/OAuthButtons.tsx` - Botones OAuth
  - `src/lib/supabase/work-order-storage.ts` - Storage
- **Crítica:** ✅ **SÍ** - Sin esto no funciona autenticación
- **Ejemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3. `SUPABASE_SERVICE_ROLE_KEY`
- **Nombre exacto:** `SUPABASE_SERVICE_ROLE_KEY`
- **Formato:** JWT token que empieza con `eyJ...`
- **Dónde se usa:**
  - `src/lib/supabase/server.ts` - `getSupabaseServiceClient()`
  - `src/app/auth/callback/route.ts` - Crear usuarios
  - `src/app/auth/register/route.ts` - Registro de usuarios
  - Todas las operaciones que requieren bypass RLS
- **Crítica:** ✅ **SÍ** - Requerida para operaciones administrativas
- **Ejemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **⚠️ IMPORTANTE:** Esta clave debe mantenerse SECRETA (no es `NEXT_PUBLIC_*`)

---

## 2️⃣ WAHA (WhatsApp HTTP API)

### ✅ **CRÍTICAS - OBLIGATORIAS (si usas WhatsApp)**

#### 4. `WAHA_API_URL`
- **Nombre exacto:** `WAHA_API_URL` (o `NEXT_PUBLIC_WAHA_API_URL` como alternativa)
- **Formato:** `https://waha-api-url.com` (sin trailing slash)
- **Dónde se usa:**
  - `src/lib/waha-sessions.ts` - `getWahaConfig()`
  - `src/app/api/whatsapp/force-webhook/route.ts` - Force webhook
  - Todas las operaciones de sesiones WAHA
- **Crítica:** ✅ **SÍ** (si usas WhatsApp) - Sin esto no funciona WhatsApp
- **Fallback:** Se puede guardar en BD (`ai_agent_config.policies.waha_api_url`)
- **Ejemplo:** `https://waha-erp-eagles-sistem.0rfifc.easypanel.host`

#### 5. `WAHA_API_KEY`
- **Nombre exacto:** `WAHA_API_KEY` (o `NEXT_PUBLIC_WAHA_API_KEY` como alternativa)
- **Formato:** String alfanumérico (clave secreta)
- **Dónde se usa:**
  - `src/lib/waha-sessions.ts` - `getWahaConfig()`
  - `src/app/api/whatsapp/force-webhook/route.ts` - Force webhook
  - Todas las operaciones de sesiones WAHA
- **Crítica:** ✅ **SÍ** (si usas WhatsApp) - Sin esto no funciona WhatsApp
- **Fallback:** Se puede guardar en BD (`ai_agent_config.policies.waha_api_key`)
- **⚠️ IMPORTANTE:** Esta clave debe mantenerse SECRETA (no usar `NEXT_PUBLIC_*` en producción)
- **Ejemplo:** `mi_clave_segura_2025`

---

## 3️⃣ AI AGENT (OpenAI / Anthropic)

### ✅ **CRÍTICAS - OBLIGATORIAS (al menos una)**

#### 6. `OPENAI_API_KEY`
- **Nombre exacto:** `OPENAI_API_KEY`
- **Formato:** `sk-...` (empieza con `sk-`)
- **Dónde se usa:**
  - `src/integrations/whatsapp/services/ai-agent.ts` - `getOpenAIClient()`
  - `src/app/api/whatsapp/test-agent/route.ts` - Test endpoint
  - `src/app/api/whatsapp/diagnose/route.ts` - Diagnóstico
  - Procesamiento de mensajes con AI
- **Crítica:** ✅ **SÍ** (si usas OpenAI) - Sin esto el bot no responde
- **Nota:** Se necesita OpenAI O Anthropic (al menos uno)
- **Ejemplo:** `sk-proj-xxxxxxxxxxxxxxxxxxxxx`

#### 7. `ANTHROPIC_API_KEY`
- **Nombre exacto:** `ANTHROPIC_API_KEY`
- **Formato:** `sk-ant-...` (empieza con `sk-ant-`)
- **Dónde se usa:**
  - `src/integrations/whatsapp/services/ai-agent.ts` - Cliente Anthropic
  - `src/app/api/whatsapp/test-agent/route.ts` - Test endpoint
  - `src/app/api/whatsapp/diagnose/route.ts` - Diagnóstico
  - Procesamiento de mensajes con AI (alternativa a OpenAI)
- **Crítica:** ⚠️ **OPCIONAL** - Solo si usas Claude en lugar de OpenAI
- **Nota:** Solo necesitas OpenAI O Anthropic, no ambos
- **Ejemplo:** `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx`

---

## 4️⃣ UPSTASH (Rate Limiting)

### ✅ **CRÍTICAS - OBLIGATORIAS**

#### 8. `UPSTASH_REDIS_REST_URL`
- **Nombre exacto:** `UPSTASH_REDIS_REST_URL`
- **Formato:** `https://xxxxx.upstash.io`
- **Dónde se usa:**
  - `src/lib/rate-limit/redis.ts` - Cliente Redis
  - `src/lib/rate-limit/rate-limiter.ts` - Rate limiting
  - `src/app/api/test-rate-limit/route.ts` - Test endpoint
- **Crítica:** ✅ **SÍ** - Sin esto falla el rate limiting
- **Ejemplo:** `https://glad-duckling-60522.upstash.io`

#### 9. `UPSTASH_REDIS_REST_TOKEN`
- **Nombre exacto:** `UPSTASH_REDIS_REST_TOKEN`
- **Formato:** String alfanumérico (token de autenticación)
- **Dónde se usa:**
  - `src/lib/rate-limit/redis.ts` - Cliente Redis
  - `src/lib/rate-limit/rate-limiter.ts` - Rate limiting
  - `src/app/api/test-rate-limit/route.ts` - Test endpoint
- **Crítica:** ✅ **SÍ** - Sin esto falla el rate limiting
- **⚠️ IMPORTANTE:** Esta clave debe mantenerse SECRETA
- **Ejemplo:** `AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 5️⃣ APP URL (Webhooks)

### ✅ **CRÍTICA - OBLIGATORIA**

#### 10. `NEXT_PUBLIC_APP_URL`
- **Nombre exacto:** `NEXT_PUBLIC_APP_URL`
- **Formato:** `https://tu-app.vercel.app` (sin trailing slash)
- **Dónde se usa:**
  - `src/lib/waha-sessions.ts` - Configurar webhooks
  - `src/app/api/whatsapp/force-webhook/route.ts` - Force webhook
  - `src/app/api/whatsapp/check-env/route.ts` - Verificación
  - `src/lib/utils/middleware.ts` - URLs de redirección
- **Crítica:** ✅ **SÍ** - Requerida para configurar webhooks de WhatsApp
- **Fallback:** `VERCEL_PROJECT_PRODUCTION_URL` (automático de Vercel)
- **Ejemplo:** `https://erp-taller-saas-correct.vercel.app`
- **⚠️ IMPORTANTE:** No debe tener saltos de línea (`\r\n` o `\n`)

---

## 6️⃣ VARIABLES OPCIONALES / DEBUG

### ⚠️ **OPCIONALES**

#### 11. `NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG`
- **Nombre exacto:** `NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG`
- **Formato:** `"true"` o `"false"` (string)
- **Dónde se usa:**
  - `src/app/dashboard/whatsapp/page.tsx` - Debug de webhooks
  - `src/app/dashboard/whatsapp/train-agent/page.tsx` - Debug en wizard
- **Crítica:** ❌ **NO** - Solo para debugging
- **Valor por defecto:** No configurado (debug deshabilitado)
- **Ejemplo:** `true`

#### 12. `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`
- **Nombre exacto:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- **Formato:** Tokens de Meta WhatsApp Business API
- **Dónde se usa:**
  - `src/app/api/whatsapp/qr/route.ts` - QR de Meta (si usas Meta directamente)
- **Crítica:** ❌ **NO** - Solo si usas Meta WhatsApp Business API directamente (sin WAHA)
- **Nota:** Si usas WAHA, NO necesitas estas variables

---

## 7️⃣ VARIABLES AUTOMÁTICAS DE VERCEL

Estas variables son proporcionadas automáticamente por Vercel, NO necesitas configurarlas:

- `VERCEL_URL` - URL del deployment actual
- `VERCEL_PROJECT_PRODUCTION_URL` - URL de producción
- `NODE_ENV` - `production`, `development`, o `test`
- `VERCEL_ENV` - `production`, `preview`, o `development`

**Nota:** El código usa `VERCEL_PROJECT_PRODUCTION_URL` como fallback de `NEXT_PUBLIC_APP_URL`.

---

## ✅ CHECKLIST PARA VERCEL DASHBOARD

### Pasos para verificar:

1. **Ir a Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Seleccionar proyecto: `erp-taller-saas-correct`
   - Settings → Environment Variables

2. **Verificar cada variable:**

#### ✅ SUPABASE (3 variables)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` está configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada (marcada como Sensitive)

#### ✅ WAHA (2 variables)
- [ ] `WAHA_API_URL` está configurada
- [ ] `WAHA_API_KEY` está configurada (marcada como Sensitive)

#### ✅ AI AGENT (1-2 variables)
- [ ] `OPENAI_API_KEY` está configurada (marcada como Sensitive) - **O**
- [ ] `ANTHROPIC_API_KEY` está configurada (marcada como Sensitive)

#### ✅ UPSTASH (2 variables)
- [ ] `UPSTASH_REDIS_REST_URL` está configurada
- [ ] `UPSTASH_REDIS_REST_TOKEN` está configurada (marcada como Sensitive)

#### ✅ APP URL (1 variable)
- [ ] `NEXT_PUBLIC_APP_URL` está configurada
- [ ] Valor correcto: `https://erp-taller-saas-correct.vercel.app`
- [ ] No tiene saltos de línea

#### ⚠️ OPCIONALES
- [ ] `NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG` (opcional, solo si necesitas debug)

---

## 🔍 CÓMO VERIFICAR EN VERCEL

### Método 1: Dashboard

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Settings → Environment Variables
4. Verifica cada variable de la lista anterior

### Método 2: Endpoint de Verificación

Llama al endpoint de diagnóstico:

```bash
GET https://erp-taller-saas-correct.vercel.app/api/whatsapp/check-env
```

O:

```bash
GET https://erp-taller-saas-correct.vercel.app/api/whatsapp/diagnose
```

### Método 3: CLI de Vercel

```bash
vercel env ls
```

---

## 📊 RESUMEN DE PRIORIDADES

### 🔴 **CRÍTICAS (9 variables - OBLIGATORIAS)**

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `WAHA_API_URL` (si usas WhatsApp)
5. `WAHA_API_KEY` (si usas WhatsApp)
6. `OPENAI_API_KEY` O `ANTHROPIC_API_KEY` (al menos uno)
7. `UPSTASH_REDIS_REST_URL`
8. `UPSTASH_REDIS_REST_TOKEN`
9. `NEXT_PUBLIC_APP_URL`

### 🟡 **OPCIONALES (2-3 variables)**

10. `NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG` (debug)
11. `WHATSAPP_ACCESS_TOKEN` (solo si usas Meta directamente)
12. `WHATSAPP_PHONE_NUMBER_ID` (solo si usas Meta directamente)

---

## 🔐 SEGURIDAD

### Variables que DEBEN estar marcadas como "Sensitive" en Vercel:

- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `WAHA_API_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `ANTHROPIC_API_KEY`
- ✅ `UPSTASH_REDIS_REST_TOKEN`
- ✅ `WHATSAPP_ACCESS_TOKEN` (si la usas)

### Variables que pueden ser públicas (`NEXT_PUBLIC_*`):

- ✅ `NEXT_PUBLIC_SUPABASE_URL` (es pública)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (está diseñada para ser pública)
- ✅ `NEXT_PUBLIC_APP_URL` (es pública)

---

## 🚨 PROBLEMAS COMUNES

### 1. Variable no se aplica después de agregarla

**Solución:** Hacer un nuevo deployment después de agregar variables

### 2. `NEXT_PUBLIC_APP_URL` tiene saltos de línea

**Solución:** Eliminar y re-agregar la variable sin saltos de línea

### 3. `NEXT_PUBLIC_APP_URL` apunta a URL incorrecta

**Solución:** 
- Verificar que el valor sea: `https://erp-taller-saas-correct.vercel.app`
- Si está mal, el código usa `VERCEL_PROJECT_PRODUCTION_URL` como fallback

### 4. WAHA no funciona aunque las variables estén configuradas

**Solución:** 
- Verificar que las variables sean `WAHA_API_URL` y `WAHA_API_KEY` (sin `NEXT_PUBLIC_*`)
- Como alternativa, guardar en BD: `ai_agent_config.policies`

### 5. AI Agent no responde

**Solución:**
- Verificar `OPENAI_API_KEY` o `ANTHROPIC_API_KEY`
- Verificar que empiece con `sk-` (OpenAI) o `sk-ant-` (Anthropic)

---

## 📝 NOTAS ADICIONALES

1. **Variables `NEXT_PUBLIC_*`:**
   - Se inyectan en tiempo de build
   - Son accesibles desde el cliente (browser)
   - Requieren redeploy para cambiar

2. **Variables sin `NEXT_PUBLIC_*`:**
   - Solo disponibles en servidor (API routes, Server Components)
   - Más seguras para claves secretas
   - Pueden cambiar sin rebuild (en algunos casos)

3. **Fallbacks:**
   - WAHA: Si no hay variables de entorno, busca en BD
   - APP_URL: Si `NEXT_PUBLIC_APP_URL` no está, usa `VERCEL_PROJECT_PRODUCTION_URL`

4. **Ambientes en Vercel:**
   - Production: Variables para producción
   - Preview: Variables para preview deployments
   - Development: Variables para desarrollo local (cuando usas `vercel dev`)

---

**Última actualización:** Enero 2025  
**Versión del documento:** 1.0

