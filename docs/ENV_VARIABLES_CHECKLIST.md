# Variables de Entorno — Confia Drive ERP

**Última actualización:** Abril 2026
**Comando de verificación:** `npm run env:check`

---

## Resumen

| Categoría | Variables | Críticas |
|---|---|---|
| Supabase | 3 | 3 |
| App URL | 1 | 1 |
| Twilio (WhatsApp) | 3 | 3 |
| Hotmart (Billing) | 1 | 1 |
| Web Push (VAPID) | 3 | 3 |
| Upstash (Rate Limiting) | 2 | 2 |
| AI Agent | 2 | 1 (al menos uno) |
| Email (SendGrid/SMTP) | 3 | 1 |
| **TOTAL** | **18** | **14** |

---

## 1. Supabase

#### `NEXT_PUBLIC_SUPABASE_URL`
- Formato: `https://xxxxx.supabase.co`
- Crítica: SÍ — sin esto no funciona nada

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Formato: JWT (`eyJ...`)
- Crítica: SÍ — autenticación del cliente

#### `SUPABASE_SERVICE_ROLE_KEY`
- Formato: JWT (`eyJ...`)
- Crítica: SÍ — operaciones que bypassean RLS
- **NUNCA exponer como `NEXT_PUBLIC_*`**

---

## 2. App URL

#### `NEXT_PUBLIC_APP_URL`
- Formato: `https://tudominio.com`
- Crítica: SÍ — OAuth callbacks, emails, webhooks

---

## 3. Twilio (WhatsApp)

#### `TWILIO_ACCOUNT_SID`
- Formato: `ACxxxxx...`
- Crítica: SÍ

#### `TWILIO_AUTH_TOKEN`
- Formato: string hex
- Crítica: SÍ — **mantener secreto**

#### `TWILIO_PHONE_NUMBER`
- Formato: `+1415xxxxxxx` (número aprobado en Twilio)
- Crítica: SÍ

---

## 4. Hotmart (Billing)

#### `NEXT_PUBLIC_HOTMART_CHECKOUT_URL`
- Formato: `https://pay.hotmart.com/XXXXXXXXX`
- Crítica: NO — tiene fallback hardcoded en código, pero se recomienda configurar
- Uso: URL de checkout de Hotmart para todos los botones de upgrade

#### `HOTMART_HOTTOK`
- Formato: string secreto configurado en el webhook de Hotmart
- Crítica: SÍ — verifica autenticidad de webhooks de pago
- Verificación: `crypto.timingSafeEqual` (seguro contra timing attacks)

---

## 5. Web Push / PWA (VAPID)

#### `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Formato: Base64 URL-safe
- Crítica: SÍ — el cliente necesita esta clave para suscribirse

#### `VAPID_PRIVATE_KEY`
- Formato: Base64 URL-safe
- Crítica: SÍ — firma los mensajes push
- **NUNCA exponer como `NEXT_PUBLIC_*`**

#### `VAPID_EMAIL`
- Formato: `mailto:admin@tudominio.com`
- Crítica: SÍ — requerido por el protocolo VAPID

Generar nuevas claves: `npx web-push generate-vapid-keys`

---

## 6. Upstash Redis (Rate Limiting)

#### `UPSTASH_REDIS_REST_URL`
- Formato: `https://xxx.upstash.io`
- Crítica: SÍ

#### `UPSTASH_REDIS_REST_TOKEN`
- Formato: string token
- Crítica: SÍ
- Nota: si Redis no responde, el rate limiting falla abierto (login sigue funcionando)

---

## 7. AI Agent (al menos una requerida)

#### `OPENAI_API_KEY`
- Formato: `sk-...`
- Crítica: si usas GPT para el agente de WhatsApp

#### `ANTHROPIC_API_KEY`
- Formato: `sk-ant-...`
- Crítica: si usas Claude para el agente de WhatsApp

---

## 8. Email

#### `SENDGRID_API_KEY`
- Formato: `SG.xxx...`
- Crítica: SÍ si usas SendGrid para emails transaccionales

#### `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`
- Alternativa a SendGrid para email SMTP directo
- Opcionales si tienes SendGrid

---

## Variables Eliminadas (no agregar)

| Variable | Motivo |
|---|---|
| `WAHA_API_URL` | WAHA eliminado — reemplazado por Twilio |
| `WAHA_API_KEY` | WAHA eliminado |
| `NEXT_PUBLIC_WAHA_API_KEY` | WAHA eliminado |
| `NEXT_PUBLIC_WAHA_API_URL` | WAHA eliminado |
| `STRIPE_SECRET_KEY` | Stripe eliminado — reemplazado por Hotmart |
| `STRIPE_PUBLISHABLE_KEY` | Stripe eliminado |
| `STRIPE_WEBHOOK_SECRET` | Stripe eliminado |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago eliminado — reemplazado por Hotmart |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | MercadoPago eliminado |

---

## Verificación en Vercel

1. Ir a Vercel → Settings → Environment Variables
2. Agregar cada variable con su valor de producción
3. Verificar que las `NEXT_PUBLIC_*` estén disponibles en los environments correctos
4. Ejecutar `npm run env:check` localmente para validar el `.env.local`
