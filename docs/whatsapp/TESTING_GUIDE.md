# 🧪 Guía Completa de Testing - WhatsApp AI Agent

## Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Testing Local](#testing-local)
3. [Testing con Webhooks Reales](#testing-con-webhooks-reales)
4. [Testing de Providers](#testing-de-providers)
5. [Testing de Funciones del Bot](#testing-de-funciones-del-bot)
6. [Debugging](#debugging)
7. [Troubleshooting](#troubleshooting)

---

## 1. Configuración Inicial

### Variables de Entorno Requeridas

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Al menos uno de estos:
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Verificar Configuración

```bash
# Health check
curl http://localhost:3000/api/whatsapp/test-agent
```

Respuesta esperada:
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

---

## 2. Testing Local

### 2.1. Testing desde el Dashboard

**Ruta:** `/dashboard/whatsapp/train-agent`

1. **Completar Configuración:**
   - Paso 1: Información del negocio
   - Paso 2: Servicios
   - Paso 3: Políticas
   - Paso 4: Personalidad
   - Paso 5: FAQs
   - Paso 6: Instrucciones personalizadas

2. **Probar en Preview:**
   - Paso 7: Preview & Test
   - Usar el chat integrado
   - Probar mensajes sugeridos

### 2.2. Testing vía API

**Endpoint:** `POST /api/whatsapp/test-agent`

```bash
curl -X POST http://localhost:3000/api/whatsapp/test-agent \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "message": "Hola, quiero agendar una cita",
    "organizationId": "your-org-id"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "response": "¡Hola! Claro, puedo ayudarte a agendar una cita...",
    "functionsCalled": ["check_availability"],
    "conversationId": "conv-xxx",
    "processingTime": 1234,
    "config": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.7
    }
  }
}
```

### 2.3. Testing con cURL - Ejemplos

```bash
# Test básico
curl -X POST http://localhost:3000/api/whatsapp/test-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola"}'

# Test con servicio específico
curl -X POST http://localhost:3000/api/whatsapp/test-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cuánto cuesta un cambio de aceite?"}'

# Test para agendar cita
curl -X POST http://localhost:3000/api/whatsapp/test-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Quiero agendar una cita para mañana a las 10am"}'
```

---

## 3. Testing con Webhooks Reales

### 3.1. Configurar Webhook URL

**Twilio:**
```
https://your-domain.com/api/webhooks/whatsapp/[organization_id]
```

**Meta:**
```
https://your-domain.com/api/webhooks/whatsapp/[organization_id]
```

**Evolution:**
```
https://your-domain.com/api/webhooks/whatsapp/[organization_id]
```

### 3.2. Testing con ngrok (Local)

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto local
ngrok http 3000

# Usar la URL de ngrok en la configuración del webhook
# Ejemplo: https://abc123.ngrok.io/api/webhooks/whatsapp/your-org-id
```

### 3.3. Verificar Webhook

**Meta - Verificación:**
```bash
# GET request automático de Meta
curl "https://your-domain.com/api/webhooks/whatsapp/your-org-id?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=test"
```

**Twilio - Testing:**
```bash
# Simular webhook de Twilio
curl -X POST https://your-domain.com/api/webhooks/whatsapp/your-org-id \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+521234567890&To=whatsapp:+14155238886&Body=Hola"
```

---

## 4. Testing de Providers

### 4.1. Testing Twilio

**Configurar en Supabase:**
```sql
INSERT INTO whatsapp_config (
  organization_id,
  provider,
  settings,
  is_active
) VALUES (
  'your-org-id',
  'twilio',
  '{
    "account_sid": "ACxxx",
    "auth_token": "xxx",
    "phone_number": "+14155238886"
  }'::jsonb,
  true
);
```

**Probar envío:**
```typescript
// Usar TwilioSender directamente
import { TwilioSender } from '@/integrations/whatsapp/senders/twilio-sender';

const sender = new TwilioSender({
  account_sid: 'ACxxx',
  auth_token: 'xxx',
  phone_number: '+14155238886'
});

await sender.sendMessage('+521234567890', 'Mensaje de prueba');
```

### 4.2. Testing Meta

**Configurar en Supabase:**
```sql
INSERT INTO whatsapp_config (
  organization_id,
  provider,
  settings,
  is_active
) VALUES (
  'your-org-id',
  'meta',
  '{
    "phone_number_id": "123456789",
    "access_token": "EAAxxx",
    "webhook_verify_token": "your-secret-token"
  }'::jsonb,
  true
);
```

**Verificar webhook:**
```bash
curl "https://your-domain.com/api/webhooks/whatsapp/your-org-id?hub.mode=subscribe&hub.verify_token=your-secret-token&hub.challenge=test123"
```

### 4.3. Testing Evolution

**Configurar en Supabase:**
```sql
INSERT INTO whatsapp_config (
  organization_id,
  provider,
  settings,
  is_active
) VALUES (
  'your-org-id',
  'evolution',
  '{
    "api_url": "https://api.evolution.com",
    "api_key": "your-api-key",
    "instance_name": "your-instance"
  }'::jsonb,
  true
);
```

---

## 5. Testing de Funciones del Bot

### 5.1. Función: check_availability

**Mensaje de prueba:**
```
"¿Tienen disponible mañana?"
```

**Resultado esperado:**
- El bot llama a `check_availability`
- Retorna horarios disponibles
- Muestra respuesta formateada

### 5.2. Función: schedule_appointment

**Mensaje de prueba:**
```
"Quiero agendar una cita para cambio de aceite mañana a las 10am"
```

**Resultado esperado:**
- El bot extrae: servicio, fecha, hora
- Llama a `schedule_appointment`
- Crea cita en la base de datos
- Confirma al usuario

### 5.3. Función: get_service_price

**Mensaje de prueba:**
```
"¿Cuánto cuesta un cambio de aceite?"
```

**Resultado esperado:**
- El bot busca el servicio en la configuración
- Llama a `get_service_price`
- Retorna precio y descripción

### 5.4. Función: create_quote

**Mensaje de prueba:**
```
"Necesito una cotización para cambio de aceite y alineación"
```

**Resultado esperado:**
- El bot identifica múltiples servicios
- Llama a `create_quote`
- Calcula totales
- Presenta cotización formateada

---

## 6. Debugging

### 6.1. Logs del Servidor

**Ver logs en tiempo real:**
```bash
npm run dev
# Buscar logs con prefijo:
# - [WebhookHandler]
# - [AIAgent]
# - [FunctionExecutor]
# - [MessageSender]
```

### 6.2. Logs del Cliente

**Abrir DevTools:**
- Console: Ver errores de frontend
- Network: Ver requests al API
- Application: Ver estado de autenticación

### 6.3. Verificar Base de Datos

**Conversaciones:**
```sql
SELECT * FROM whatsapp_conversations 
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC;
```

**Mensajes:**
```sql
SELECT * FROM whatsapp_messages 
WHERE conversation_id = 'conv-id'
ORDER BY created_at ASC;
```

**Configuración AI:**
```sql
SELECT * FROM ai_agent_config 
WHERE organization_id = 'your-org-id';
```

### 6.4. Debug Mode

**Habilitar logs detallados:**
```typescript
// En desarrollo, los logs ya están habilitados
// Ver: console.log en cada servicio
```

---

## 7. Troubleshooting

### Problema: "AI Agent no configurado"

**Solución:**
1. Verificar que existe registro en `ai_agent_config`
2. Verificar que `enabled = true`
3. Completar wizard en `/dashboard/whatsapp/train-agent`

```sql
SELECT * FROM ai_agent_config WHERE organization_id = 'your-org-id';
```

### Problema: "OpenAI API Key inválida"

**Solución:**
1. Verificar `OPENAI_API_KEY` en `.env.local`
2. Verificar que la key tiene créditos
3. Probar con curl:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Problema: "Webhook no válido"

**Solución:**
1. Verificar firma de Twilio (si aplica)
2. Verificar verify token de Meta (si aplica)
3. Verificar API key de Evolution (si aplica)
4. Revisar logs del servidor

### Problema: "Bot no responde"

**Checklist:**
- [ ] AI Agent configurado y habilitado
- [ ] API Key válida (OpenAI/Anthropic)
- [ ] Configuración de servicios completada
- [ ] Horarios de negocio configurados
- [ ] Revisar logs para errores

### Problema: "Funciones no se ejecutan"

**Solución:**
1. Verificar que los servicios están configurados
2. Verificar que los adapters funcionan
3. Revisar logs de `FunctionExecutor`
4. Probar función manualmente

### Problema: "Mensajes no se guardan"

**Solución:**
1. Verificar conexión a Supabase
2. Verificar permisos RLS
3. Revisar logs de `webhook-handler`
4. Verificar estructura de tablas

---

## 8. Testing Avanzado

### 8.1. Testing de Escalamiento

**Mensaje para escalar:**
```
"Necesito hablar con un humano urgente"
```

**Configurar keywords:**
```json
{
  "escalation_rules": {
    "keywords_to_escalate": ["urgente", "humano", "supervisor"]
  }
}
```

### 8.2. Testing de Horarios

**Configurar horarios:**
```json
{
  "business_hours": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" }
  }
}
```

**Probar fuera de horario:**
- El bot debe indicar que está cerrado
- Debe mostrar horarios disponibles

### 8.3. Testing de Personalidad

**Tono formal:**
```json
{
  "personality": {
    "tone": "formal",
    "use_emojis": false
  }
}
```

**Tono amigable:**
```json
{
  "personality": {
    "tone": "amigable",
    "use_emojis": true
  }
}
```

---

## 9. Métricas y Monitoreo

### 9.1. Ver Estadísticas

**Query SQL:**
```sql
-- Mensajes procesados hoy
SELECT COUNT(*) FROM whatsapp_messages 
WHERE organization_id = 'your-org-id'
AND created_at >= CURRENT_DATE;

-- Conversaciones activas
SELECT COUNT(*) FROM whatsapp_conversations 
WHERE organization_id = 'your-org-id'
AND status = 'active';

-- Tiempo promedio de respuesta
SELECT AVG(processing_time) 
FROM whatsapp_messages 
WHERE direction = 'outbound'
AND created_at >= CURRENT_DATE;
```

### 9.2. Alertas

**Configurar alertas para:**
- Errores en webhook
- Tiempo de respuesta > 5s
- Fallos en funciones
- Rate limits de API

---

## 10. Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Twilio WhatsApp Docs](https://www.twilio.com/docs/whatsapp)
- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

**¿Necesitas ayuda?** Revisa los logs, la base de datos y la configuración paso a paso.

