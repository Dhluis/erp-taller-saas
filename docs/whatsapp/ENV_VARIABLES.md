# 🔐 Variables de Entorno - WhatsApp AI Agent

## Configuración Completa

Copia este contenido a tu archivo `.env.local`:

```bash
# ============================================
# WHATSAPP AI AGENT - Variables de Entorno
# ============================================
# 
# Copia este archivo a .env.local y completa con tus valores reales
# cp env.local.example .env.local

# ============================================
# SUPABASE (Requerido)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# AI PROVIDERS (Al menos uno requerido)
# ============================================

# OpenAI (Recomendado para desarrollo)
# Obtén tu key en: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Anthropic Claude (Opcional, alternativo a OpenAI)
# Obtén tu key en: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# ============================================
# WHATSAPP PROVIDERS (Configura según el que uses)
# ============================================

# Twilio WhatsApp (Si usas Twilio)
# Obtén tus credenciales en: https://console.twilio.com/
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+14155238886

# Meta WhatsApp Business API (Si usas Meta)
# Obtén tus credenciales en: https://developers.facebook.com/
META_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
META_WHATSAPP_ACCESS_TOKEN=your-access-token
META_WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

# Evolution API (Si usas Evolution)
# Configura tu instancia de Evolution API
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your-evolution-api-key
EVOLUTION_INSTANCE_NAME=your-instance-name

# ============================================
# APP CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development

# ============================================
# NOTAS IMPORTANTES
# ============================================
# 
# 1. NUNCA subas .env.local a Git
# 2. OpenAI y Anthropic: Solo necesitas uno, pero puedes tener ambos
# 3. WhatsApp Providers: Solo configura el que vayas a usar
# 4. Para producción, usa variables de entorno del hosting (Vercel, etc.)
# 
# ============================================
```

## Variables Requeridas Mínimas

Para que funcione el sistema básico, necesitas:

```bash
# Mínimo requerido
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=xxx  # O ANTHROPIC_API_KEY
```

## Variables Opcionales por Provider

### Si usas Twilio:
```bash
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=xxx
```

### Si usas Meta:
```bash
META_WHATSAPP_PHONE_NUMBER_ID=xxx
META_WHATSAPP_ACCESS_TOKEN=xxx
META_WHATSAPP_VERIFY_TOKEN=xxx
```

### Si usas Evolution:
```bash
EVOLUTION_API_URL=xxx
EVOLUTION_API_KEY=xxx
EVOLUTION_INSTANCE_NAME=xxx
```

## Verificación

Para verificar que las variables están configuradas:

```bash
# Health check del endpoint
curl http://localhost:3000/api/whatsapp/test-agent
```

Deberías ver:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "openai": "configured",
    "anthropic": "not_configured"
  }
}
```

## Producción

En producción (Vercel, Netlify, etc.), configura las variables en el dashboard del hosting:

1. Ve a Settings > Environment Variables
2. Agrega cada variable una por una
3. Reinicia el deployment

**NUNCA** agregues `.env.local` al repositorio Git.

