# Guía de Despliegue — Eagles System ERP

**Plataforma de producción:** Vercel
**Última actualización:** Abril 2026

---

## Despliegue en Vercel (flujo actual)

### 1. Conectar repositorio

1. Entrar a [vercel.com](https://vercel.com) con la cuenta del proyecto
2. Importar el repositorio de GitHub `erp-taller-saas`
3. Framework preset: **Next.js** (se detecta automáticamente)

### 2. Configurar variables de entorno

En Vercel → Settings → Environment Variables, agregar todas las variables listadas en [ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md).

Variables mínimas obligatorias:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://tudominio.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1415xxxxxxx

# Hotmart
HOTMART_HOTTOK=xxx...

# VAPID (Push Notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_EMAIL=mailto:admin@tudominio.com

# Upstash (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx...
```

### 3. Build settings (por defecto, no cambiar)

```
Build Command:   npm run build
Output Directory: .next
Install Command: npm install
```

### 4. Dominio personalizado

1. Vercel → Settings → Domains → Add domain
2. Agregar el CNAME o A record en tu proveedor DNS
3. Vercel genera SSL automáticamente (Let's Encrypt)
4. Actualizar `NEXT_PUBLIC_APP_URL` con el dominio final

### 5. Deploy automático

Cada push a `main` dispara un deploy automático en Vercel. Las ramas generan preview deployments con URL propia.

---

## Configurar Supabase para producción

### Auth callback URL

En Supabase → Authentication → URL Configuration:

```
Site URL: https://tudominio.com
Redirect URLs:
  https://tudominio.com/auth/callback
  https://tudominio.com/auth/confirm
```

Ver detalles en [CONFIGURAR_SUPABASE_AUTH_CALLBACK.md](./CONFIGURAR_SUPABASE_AUTH_CALLBACK.md).

### Google OAuth

En Google Cloud Console → Credentials → OAuth 2.0:
- Authorized redirect URIs: `https://xxx.supabase.co/auth/v1/callback`
- Agregar dominio en `Authorized JavaScript origins`

Ver detalles en [GOOGLE_OAUTH_CUSTOM_DOMAIN.md](./GOOGLE_OAUTH_CUSTOM_DOMAIN.md).

---

## Configurar Twilio para producción

1. En Twilio Console → Messaging → WhatsApp Senders
2. Webhook URL del número: `https://tudominio.com/api/messaging/twilio/webhook/{organizationId}`
3. El `organizationId` es el UUID de la organización en Supabase

Ver detalles en [twilio/GUIA_PASO_A_PASO_BUNDLE.md](./twilio/GUIA_PASO_A_PASO_BUNDLE.md).

---

## Variables de entorno por ambiente

Vercel maneja tres environments: `Production`, `Preview`, `Development`.

- `Production` → rama `main`
- `Preview` → otras ramas (pull requests)
- `Development` → `vercel dev` local

Las variables `NEXT_PUBLIC_*` se incluyen en el bundle del cliente — no colocar secretos con ese prefijo.

---

## Verificar el deploy

Después de cada deploy, verificar:

1. `https://tudominio.com/` — carga el login
2. `https://tudominio.com/auth/callback` — retorna 400 (esperado sin parámetros, no 404)
3. Login con Google funciona
4. Dashboard carga datos reales
5. `npm run env:check` localmente para validar todas las variables

---

## Rollback

Si un deploy rompe algo:

1. Vercel → Deployments → seleccionar el deploy anterior → Promote to Production
2. El rollback es instantáneo (no requiere rebuild)
3. Investigar el error en Vercel → Functions → Logs antes de re-deployar

---

## Migraciones de base de datos

Las migraciones NO se ejecutan automáticamente en el deploy. Ejecutar manualmente:

```bash
npm run migrate
# o directamente en Supabase SQL Editor
```

Ver [LEGACY_DATA_MIGRATION_GUIDE.md](./LEGACY_DATA_MIGRATION_GUIDE.md) para migrar datos legacy.
