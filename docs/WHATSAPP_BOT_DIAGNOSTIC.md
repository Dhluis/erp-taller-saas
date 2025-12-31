# 🔍 DIAGNÓSTICO DE BOT DE WHATSAPP

**Fecha:** 2025-01-10  
**Problema:** El bot de WhatsApp no responde a mensajes

---

## 📋 CHECKLIST DE DIAGNÓSTICO

### 1️⃣ **Verificar AI Agent Enabled**

**Endpoint:** `GET /api/whatsapp/diagnose`

**Verificación manual:**
```sql
SELECT enabled, provider, model 
FROM ai_agent_config 
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4';
```

**Resultado esperado:**
- `enabled = true` ✅
- `provider = 'openai'` o `'anthropic'`
- `model` configurado

**Si está deshabilitado:**
- Ir a Configuración → WhatsApp → Habilitar AI Agent

---

### 2️⃣ **Verificar OPENAI_API_KEY**

**Endpoint:** `GET /api/whatsapp/diagnose`

**Verificación manual en Vercel:**
1. Ir a Vercel Dashboard → Proyecto → Settings → Environment Variables
2. Buscar `OPENAI_API_KEY` o `ANTHROPIC_API_KEY`
3. Verificar que esté configurada para **Production**

**Verificación en código:**
```typescript
// El endpoint /api/whatsapp/diagnose muestra:
{
  checks: {
    apiKeys: {
      openai: { configured: true/false },
      status: 'ok' | 'missing'
    }
  }
}
```

**Si falta:**
```bash
# Agregar en Vercel:
vercel env add OPENAI_API_KEY production
# O desde Dashboard: Settings → Environment Variables
```

---

### 3️⃣ **Verificar Webhook Llegando**

**Endpoint:** `GET /api/whatsapp/diagnose`

**Verificación en logs de Vercel:**
1. Ir a Vercel Dashboard → Proyecto → Deployments → Logs
2. Buscar logs con: `[WAHA Webhook]` o `[Webhook]`
3. Verificar que aparezcan cuando envías un mensaje

**Logs esperados:**
```
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
[Webhook] 📋 Event Type: message
[Webhook] 🆔 Message ID: ...
[WAHA Webhook] 📱 Mensaje recibido de: +1234567890
```

**Si no aparecen logs:**
- Verificar que el webhook esté configurado en WAHA
- Llamar a `/api/whatsapp/force-webhook` para actualizar webhook
- Verificar que `NEXT_PUBLIC_APP_URL` esté correcta

**Verificación en BD:**
```sql
SELECT id, from_number, body, created_at 
FROM whatsapp_messages 
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  AND direction = 'inbound'
ORDER BY created_at DESC 
LIMIT 5;
```

**Si no hay mensajes:**
- El webhook no está llegando
- Verificar configuración de WAHA

---

### 4️⃣ **Verificar Conversación Bot Active**

**Endpoint:** `POST /api/whatsapp/diagnose` (con `phoneNumber`)

**Verificación manual:**
```sql
SELECT id, customer_phone, is_bot_active, assigned_to, status
FROM whatsapp_conversations 
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  AND customer_phone = '+1234567890'
  AND status = 'active';
```

**Resultado esperado:**
- `is_bot_active = true` ✅
- `assigned_to = null` ✅ (si está asignado a humano, el bot no responde)
- `status = 'active'` ✅

**Si `is_bot_active = false`:**
- El bot está desactivado para esta conversación
- Activar desde la UI de conversaciones

**Si `assigned_to IS NOT NULL`:**
- La conversación está asignada a un humano
- El bot no responderá automáticamente

---

## 🚀 USO DEL ENDPOINT DE DIAGNÓSTICO

### Diagnóstico General (GET)

```bash
# Desde navegador (con sesión autenticada):
https://erp-taller-saas-correct.vercel.app/api/whatsapp/diagnose

# O con curl (necesita cookies de sesión):
curl -X GET https://erp-taller-saas-correct.vercel.app/api/whatsapp/diagnose \
  -H "Cookie: sb-xxx-auth-token=..."
```

**Respuesta:**
```json
{
  "success": true,
  "diagnostics": {
    "organizationId": "b3962fe4-d238-42bc-9455-4ed84a38c6b4",
    "checks": {
      "aiAgentConfig": {
        "status": "ok",
        "enabled": true,
        "provider": "openai",
        "model": "gpt-4"
      },
      "apiKeys": {
        "status": "ok",
        "openai": { "configured": true }
      },
      "webhook": {
        "status": "ok",
        "recentMessagesCount": 5,
        "lastMessage": { ... }
      },
      "conversations": {
        "status": "ok",
        "botActive": 3
      },
      "wahaSession": {
        "status": "ok",
        "sessionName": "eagles_b3962fe4d23842bc9455"
      }
    },
    "summary": {
      "passedChecks": 5,
      "totalChecks": 5,
      "status": "ok",
      "issues": []
    }
  }
}
```

---

### Diagnóstico Específico por Número (POST)

```bash
curl -X POST https://erp-taller-saas-correct.vercel.app/api/whatsapp/diagnose \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{"phoneNumber": "+1234567890"}'
```

**Respuesta:**
```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "conversation": {
    "id": "conv-123",
    "isBotActive": true,
    "assignedTo": null,
    "status": "active",
    "messagesCount": 5
  },
  "aiConfig": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4"
  },
  "recentMessages": [ ... ],
  "diagnosis": {
    "botShouldRespond": true,
    "reasons": []
  }
}
```

---

## 🔧 PROBLEMAS COMUNES Y SOLUCIONES

### ❌ Problema 1: `enabled = false`

**Síntoma:**
```json
{
  "checks": {
    "aiAgentConfig": {
      "enabled": false
    }
  }
}
```

**Solución:**
1. Ir a Configuración → WhatsApp
2. Habilitar "AI Agent"
3. Guardar configuración

---

### ❌ Problema 2: `OPENAI_API_KEY` no configurada

**Síntoma:**
```json
{
  "checks": {
    "apiKeys": {
      "status": "missing"
    }
  }
}
```

**Solución:**
```bash
# Agregar en Vercel:
vercel env add OPENAI_API_KEY production
# Pegar el valor de la API key
```

O desde Dashboard:
1. Vercel → Proyecto → Settings → Environment Variables
2. Agregar `OPENAI_API_KEY`
3. Valor: `sk-...`
4. Environment: Production, Preview, Development
5. Guardar y hacer redeploy

---

### ❌ Problema 3: Webhook no llega

**Síntoma:**
```json
{
  "checks": {
    "webhook": {
      "recentMessagesCount": 0
    }
  }
}
```

**Solución:**
1. Verificar que WAHA esté enviando webhooks:
   ```bash
   # Llamar a force-webhook:
   GET https://erp-taller-saas-correct.vercel.app/api/whatsapp/force-webhook
   ```

2. Verificar logs de Vercel:
   - Deployments → Logs
   - Buscar `[WAHA Webhook]`

3. Verificar `NEXT_PUBLIC_APP_URL`:
   ```bash
   GET https://erp-taller-saas-correct.vercel.app/api/whatsapp/check-env
   ```

---

### ❌ Problema 4: `is_bot_active = false`

**Síntoma:**
```json
{
  "conversation": {
    "isBotActive": false
  },
  "diagnosis": {
    "botShouldRespond": false,
    "reasons": ["Bot inactivo en esta conversación"]
  }
}
```

**Solución:**
1. Ir a WhatsApp → Conversaciones
2. Buscar la conversación
3. Activar bot (toggle `is_bot_active`)

O desde SQL:
```sql
UPDATE whatsapp_conversations 
SET is_bot_active = true 
WHERE id = 'conv-123';
```

---

### ❌ Problema 5: Conversación asignada a humano

**Síntoma:**
```json
{
  "conversation": {
    "assignedTo": "user-123"
  },
  "diagnosis": {
    "botShouldRespond": false,
    "reasons": ["Conversación asignada a humano"]
  }
}
```

**Solución:**
- Esto es **correcto**: si está asignada a humano, el bot NO debe responder
- Si quieres que el bot responda, desasignar la conversación

---

## 📊 FLUJO DE VERIFICACIÓN COMPLETO

```
1. GET /api/whatsapp/diagnose
   ↓
2. Verificar summary.status
   ↓
3. Si status = "issues":
   ↓
4. Revisar cada check:
   - aiAgentConfig.enabled
   - apiKeys.status
   - webhook.recentMessagesCount
   - conversations.botActive
   ↓
5. Corregir problemas identificados
   ↓
6. Volver a verificar
```

---

## 🔍 LOGS A REVISAR EN VERCEL

**Buscar en logs:**
- `[WAHA Webhook]` - Eventos recibidos
- `[Webhook]` - Procesamiento de mensajes
- `[WAHA Webhook] ⏸️ Bot inactivo` - Bot desactivado
- `[WAHA Webhook] ❌ No se encontró configuración AI` - Config faltante
- `[WAHA Webhook] ⏸️ AI Agent deshabilitado` - AI deshabilitado
- `[WAHA Webhook] 🤖 Procesando con AI Agent...` - Bot procesando ✅

---

## 📝 BASADO EN SKILLS

Este diagnóstico está basado en:
- `/mnt/skills/user/eagles-erp-developer/references/whatsapp.md` líneas 651-671
- Flujo de procesamiento de mensajes en `src/app/api/webhooks/whatsapp/route.ts`
- Verificaciones en `src/integrations/whatsapp/services/ai-agent.ts`

---

**Última actualización:** 2025-01-10

