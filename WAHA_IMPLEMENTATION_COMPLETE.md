# 📱 WAHA (WhatsApp HTTP API) - Implementación Completa

## 📋 ÍNDICE
1. [Arquitectura General](#arquitectura-general)
2. [Endpoints API](#endpoints-api)
3. [Webhooks](#webhooks)
4. [Servicios y Funciones](#servicios-y-funciones)
5. [Logs y Diagnóstico](#logs-y-diagnóstico)
6. [Configuración](#configuración)
7. [Flujos de Trabajo](#flujos-de-trabajo)
8. [Base de Datos](#base-de-datos)

---

## 🏗️ ARQUITECTURA GENERAL

### **Sistema Multi-tenant**
- Cada organización tiene su propia sesión única de WhatsApp
- Formato de sesión: `eagles_<orgId sin guiones, primeros 20 caracteres>`
- Ejemplo: `eagles_00000000000000000000`

### **Componentes Principales**

```
┌─────────────────────────────────────────────────────────┐
│                    WAHA SERVER                          │
│  (WhatsApp HTTP API - Servidor externo)                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Webhooks
                   │
┌──────────────────▼──────────────────────────────────────┐
│              ERP-TALLER-SAAS                            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /api/webhooks/whatsapp (POST)                   │  │
│  │  - Recibe eventos de WAHA                        │  │
│  │  - Procesa mensajes                              │  │
│  │  - Envía respuestas                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /lib/waha-sessions.ts                           │  │
│  │  - Gestión de sesiones                           │  │
│  │  - Configuración de webhooks                     │  │
│  │  - Envío de mensajes                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  /integrations/whatsapp/services/                │  │
│  │  - ai-agent.ts (Procesamiento con IA)            │  │
│  │  - context-loader.ts (Carga de contexto)        │  │
│  │  - function-executor.ts (Ejecución de funciones) │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Supabase Database                               │  │
│  │  - whatsapp_conversations                        │  │
│  │  - whatsapp_messages                             │  │
│  │  - ai_agent_config                               │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🔌 ENDPOINTS API

### **1. Webhook Principal**
**`POST /api/webhooks/whatsapp`**
- **Descripción**: Recibe eventos de WAHA (mensajes, cambios de estado)
- **Eventos procesados**:
  - `message`: Mensajes entrantes
  - `session.status`: Cambios de estado de conexión
  - `message.reaction`: Reacciones (solo log)
- **Funcionalidades**:
  - ✅ Deduplicación de mensajes (cache en memoria)
  - ✅ Filtrado de estados de WhatsApp (`status@broadcast`)
  - ✅ Detección de multimedia (imágenes, audios, videos, documentos)
  - ✅ Procesamiento con IA
  - ✅ Envío de respuestas automáticas

**Logs esperados:**
```
============================================================
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
[Webhook] 📋 Event Type: message
[Webhook] 🆔 Message ID: <messageId>
[Webhook] 📦 Session: eagles_00000000000000000000
[Webhook] ⏰ Timestamp: 2025-12-04T04:53:28.185Z
[Webhook] 📊 Cache size: 0
============================================================
```

---

### **2. Gestión de Sesiones**

#### **`GET /api/whatsapp/session`**
- **Descripción**: Obtiene el estado de la sesión de WhatsApp
- **Response**:
```json
{
  "connected": true,
  "phone": "5214492195701",
  "status": "WORKING",
  "sessionName": "eagles_00000000000000000000"
}
```

#### **`POST /api/whatsapp/session`**
- **Descripción**: Gestiona la sesión (conectar, desconectar, actualizar webhook)
- **Actions**:
  - `connect`: Conectar sesión
  - `disconnect`: Desconectar sesión
  - `update_webhook`: Actualizar configuración del webhook

---

### **3. QR Code**

#### **`GET /api/whatsapp/qr`**
- **Descripción**: Obtiene el código QR para vincular WhatsApp
- **Response**:
```json
{
  "qr": "data:image/png;base64,...",
  "sessionName": "eagles_00000000000000000000"
}
```

---

### **4. Configuración del Webhook**

#### **`GET /api/whatsapp/webhook-config`**
- **Descripción**: Obtiene la configuración actual del webhook
- **Response**:
```json
{
  "success": true,
  "webhookConfig": {
    "url": "https://erp-taller-saas.vercel.app/api/webhooks/whatsapp",
    "events": ["message", "session.status"],
    "downloadMedia": true,
    "downloadMediaOnMessage": true
  },
  "needsUpdate": false
}
```

#### **`POST /api/whatsapp/webhook-config`**
- **Descripción**: Actualiza la configuración del webhook
- **Funcionalidad**: Configura eventos y `downloadMedia: true`

---

### **5. Envío de Mensajes**

#### **`POST /api/whatsapp/send`**
- **Descripción**: Envía un mensaje de texto a un número
- **Body**:
```json
{
  "to": "521234567890",
  "message": "Hola, este es un mensaje de prueba"
}
```

---

### **6. Prueba del Agente**

#### **`POST /api/whatsapp/test-agent`**
- **Descripción**: Prueba el agente de IA con un mensaje simulado
- **Body**:
```json
{
  "message": "¿Qué horario tienen?",
  "organizationId": "00000000-0000-0000-0000-000000000001"
}
```

**Logs esperados:**
```
[Config Test] 🧪 Procesando mensaje de prueba...
[AIAgent] 🚀 Procesando mensaje para conversación: test-<timestamp>
[AIAgent] 📍 Organization ID: 00000000-0000-0000-0000-000000000001
[AIAgent] 💬 Mensaje: ¿Qué horario tienen?
[ContextLoader] 🔍 Buscando AI config para organizationId: ...
[ContextLoader] ====== CONFIGURACIÓN AI ENCONTRADA ======
[AIAgent] ====== SYSTEM PROMPT CONSTRUIDO ======
[Config Test] ✅ Result: true
```

---

### **7. Verificación de Conexión**

#### **`GET /api/whatsapp/check-connection`**
- **Descripción**: Verifica si WhatsApp está conectado
- **Response**:
```json
{
  "connected": true,
  "phone": "5214492195701"
}
```

---

### **8. Configuración del Bot**

#### **`GET /api/whatsapp/config`**
- **Descripción**: Obtiene la configuración del bot de IA
- **Response**: Configuración completa de `ai_agent_config`

---

## 🔔 WEBHOOKS

### **Configuración del Webhook en WAHA**

**Eventos configurados:**
- ✅ `message`: Mensajes entrantes
- ✅ `session.status`: Cambios de estado de conexión
- ❌ `message.any`: **NO configurado** (causa duplicados)

**Configuración:**
```typescript
{
  url: "https://erp-taller-saas.vercel.app/api/webhooks/whatsapp",
  events: ["message", "session.status"],
  downloadMedia: true,
  downloadMediaOnMessage: true
}
```

### **Flujo de Procesamiento de Mensajes**

```
1. WAHA recibe mensaje de WhatsApp
   ↓
2. WAHA envía webhook a /api/webhooks/whatsapp
   ↓
3. Webhook verifica deduplicación (cache)
   ↓
4. Webhook filtra estados y grupos
   ↓
5. Webhook detecta multimedia
   ↓
6. Webhook guarda mensaje en BD
   ↓
7. Webhook verifica si bot está activo
   ↓
8. Webhook procesa con IA (ai-agent.ts)
   ↓
9. Webhook envía respuesta (si hay)
   ↓
10. Webhook guarda mensaje saliente en BD
```

### **Deduplicación de Mensajes**

**Cache en memoria:**
- TTL: 60 segundos
- Limpieza: Cada 30 segundos
- Clave: `messageId` o `session_from_timestamp`

**Logs de deduplicación:**
```
[Webhook] ⏭️ DUPLICADO DETECTADO Y BLOQUEADO
[Webhook] 🆔 Message ID: <messageId>
[Webhook] ⏰ Procesado hace: 2s (2000ms)
[Webhook] 📊 Cache size: 5
```

---

## 🛠️ SERVICIOS Y FUNCIONES

### **`/lib/waha-sessions.ts`**

#### **Funciones Principales:**

1. **`generateSessionName(organizationId: string): string`**
   - Genera nombre único de sesión por organización
   - Formato: `eagles_<orgId sin guiones, primeros 20 caracteres>`

2. **`getWahaConfig(organizationId?: string): Promise<{ url: string; key: string }>`**
   - Obtiene configuración WAHA (URL y API Key)
   - Prioridad:
     1. Variables de entorno (`WAHA_API_URL`, `WAHA_API_KEY`)
     2. Base de datos (`ai_agent_config.policies`)
     3. Cualquier registro en BD que tenga la config

3. **`createOrganizationSession(organizationId: string): Promise<string>`**
   - Crea sesión de WhatsApp para una organización
   - Configura webhook automáticamente
   - Guarda nombre de sesión en BD

4. **`updateSessionWebhook(sessionName: string, organizationId?: string): Promise<void>`**
   - Actualiza configuración del webhook
   - Habilita `downloadMedia: true`

5. **`getSessionStatus(sessionName: string, organizationId?: string): Promise<{...}>`**
   - Obtiene estado de la sesión
   - Retorna: `exists`, `status`, `me`, `error`

6. **`getSessionQR(sessionName: string, organizationId?: string): Promise<any>`**
   - Obtiene código QR para vincular WhatsApp

7. **`sendWhatsAppMessage(sessionName: string, to: string, text: string, organizationId?: string): Promise<any>`**
   - Envía mensaje de texto a un número

8. **`logoutSession(sessionName: string, organizationId?: string): Promise<void>`**
   - Cierra sesión de WhatsApp (logout)

---

### **`/integrations/whatsapp/services/ai-agent.ts`**

#### **Función Principal:**

**`processMessage({ organizationId, conversationId, customerMessage, customerPhone, useServiceClient }): Promise<{ success: boolean, response?: string, error?: string }>`**

- Procesa mensaje del cliente con IA
- Carga contexto del taller (servicios, mecánicos, políticas, FAQs)
- Genera respuesta usando OpenAI/Anthropic
- Ejecuta funciones si es necesario (agendar citas, consultar precios, etc.)

**Logs esperados:**
```
[AIAgent] 🚀 Procesando mensaje para conversación: <conversationId>
[AIAgent] 📍 Organization ID: <organizationId>
[AIAgent] 💬 Mensaje: <customerMessage>
[ContextLoader] 🔍 Buscando AI config para organizationId: ...
[ContextLoader] ====== CONFIGURACIÓN AI ENCONTRADA ======
[AIAgent] ====== SYSTEM PROMPT CONSTRUIDO ======
[AIAgent] 🚀 Llamando a provider: openai
[AIAgent] ✅ Respuesta generada: <response>
```

---

### **`/integrations/whatsapp/services/context-loader.ts`**

#### **Función Principal:**

**`loadAIContext(organizationId: string, useServiceClient: boolean = false): Promise<AIContext>`**

- Carga contexto completo del taller:
  - Información del negocio
  - Servicios disponibles
  - Mecánicos
  - Políticas (garantía, pagos, cancelaciones)
  - FAQs
  - Horarios de atención

**Logs esperados:**
```
[ContextLoader] 🔍 Buscando AI config para organizationId: ...
[ContextLoader] ====== CONFIGURACIÓN AI ENCONTRADA ======
[ContextLoader] ✅ Enabled: true
[ContextLoader] 🤖 Provider: openai
[ContextLoader] 🧠 Model: gpt-4o-mini
[ContextLoader] ====== CONTEXTO AI CONSTRUIDO ======
[ContextLoader] 🏢 Organization Name: Taller Eagles Demo
[ContextLoader] 🔧 Services: 5 items
[ContextLoader] 👥 Mechanics: 3 items
[ContextLoader] 📋 Policies: 11 items
```

---

## 📊 LOGS Y DIAGNÓSTICO

### **Logs del Webhook**

#### **Evento Recibido:**
```
============================================================
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
[Webhook] 📋 Event Type: message
[Webhook] 🆔 Message ID: <messageId>
[Webhook] 📦 Session: eagles_00000000000000000000
[Webhook] ⏰ Timestamp: 2025-12-04T04:53:28.185Z
[Webhook] 📊 Cache size: 0
[Webhook] 📝 Cache keys: []
============================================================
```

#### **Mensaje Duplicado:**
```
============================================================
[Webhook] ⏭️ DUPLICADO DETECTADO Y BLOQUEADO
[Webhook] 🆔 Message ID: <messageId>
[Webhook] 📋 Event Type: message
[Webhook] ⏰ Procesado hace: 2s (2000ms)
[Webhook] 📊 Cache size: 5
============================================================
```

#### **Estado de WhatsApp Ignorado:**
```
[WAHA Webhook] ⏭️ Ignorando estado de WhatsApp (status@broadcast)
[WAHA Webhook] 📋 From: status@broadcast To: status@broadcast
[WAHA Webhook] 📋 Broadcast: true Source: app
```

#### **Multimedia Detectado:**
```
[WAHA Webhook] 🔍 DIAGNÓSTICO MULTIMEDIA: {
  messageType: 'video',
  hasMediaField: true,
  hasMediaUrl: true,
  hasPayloadMedia: true,
  mimetype: 'video/mp4'
}
[WAHA Webhook] 📎 Media detectado: {
  mediaType: 'video',
  mediaUrl: 'http://localhost:80/api/files/...',
  mimetype: 'video/mp4',
  originalType: 'video',
  hasMediaUrl: true,
  mediaLocation: 'payload.media'
}
```

#### **Procesamiento con IA:**
```
[Webhook] 🤖 ANTES de llamar a AI - messageId: <messageId>
[AIAgent] 🚀 Procesando mensaje para conversación: <conversationId>
[ContextLoader] ====== CONFIGURACIÓN AI ENCONTRADA ======
[AIAgent] ====== SYSTEM PROMPT CONSTRUIDO ======
[Webhook] 🤖 DESPUÉS de AI - messageId: <messageId> - Respuesta: SÍ
[Webhook] 📤 ENVIANDO respuesta - messageId: <messageId>
[WAHA Webhook] ✅ Respuesta enviada y guardada
============================================================
[Webhook] ✅✅✅ MENSAJE COMPLETAMENTE PROCESADO
[Webhook] 🆔 Message ID: <messageId>
[Webhook] 📤 Respuesta enviada: SÍ
[Webhook] ⏱️ Tiempo total: 1021ms
============================================================
```

---

### **Logs de Sesión**

#### **Carga de Sesión:**
```
[WAHA Sessions] 🔍 Buscando configuración WAHA...
[WAHA Sessions] ⚠️ Variables de entorno no encontradas, buscando en BD...
[WAHA Sessions] 🔍 Buscando configuración en BD para organización: <orgId>
[WAHA Sessions] ✅ Usando configuración de BD (cualquier organización)
[WAHA Sessions] ✅ Sesión encontrada: eagles_00000000000000000000
[WhatsApp Session] 📊 Estado de sesión: { exists: true, status: 'WORKING' }
[WhatsApp Session] ✅ Sesión conectada: 5214492195701
```

---

## ⚙️ CONFIGURACIÓN

### **Variables de Entorno (Opcional)**

```env
WAHA_API_URL=https://waha-erp-eagles-sistem...
WAHA_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_APP_URL=https://erp-taller-saas.vercel.app
```

### **Configuración en Base de Datos**

**Tabla: `ai_agent_config`**

**Campo: `policies` (JSONB)**

```json
{
  "waha_api_url": "https://waha-erp-eagles-sistem...",
  "waha_api_key": "tu_api_key_aqui"
}
```

**Prioridad de configuración:**
1. Variables de entorno (si existen)
2. `ai_agent_config.policies` para la organización específica
3. Cualquier registro en `ai_agent_config` que tenga la config

---

## 🔄 FLUJOS DE TRABAJO

### **1. Vincular WhatsApp (Primera Vez)**

```
1. Usuario va a /dashboard/whatsapp
   ↓
2. Sistema crea sesión: createOrganizationSession()
   ↓
3. WAHA genera QR code
   ↓
4. Usuario escanea QR con WhatsApp
   ↓
5. WAHA envía evento session.status: WORKING
   ↓
6. Sistema actualiza whatsapp_connected: true
   ↓
7. Sistema muestra número conectado
```

### **2. Recibir Mensaje**

```
1. Cliente envía mensaje a WhatsApp
   ↓
2. WAHA recibe mensaje
   ↓
3. WAHA envía webhook a /api/webhooks/whatsapp
   ↓
4. Webhook verifica deduplicación
   ↓
5. Webhook filtra estados/grupos
   ↓
6. Webhook detecta multimedia (si hay)
   ↓
7. Webhook guarda mensaje en whatsapp_messages
   ↓
8. Webhook verifica si bot está activo
   ↓
9. Webhook procesa con IA (ai-agent.ts)
   ↓
10. IA genera respuesta
   ↓
11. Webhook envía respuesta (sendWhatsAppMessage)
   ↓
12. Webhook guarda mensaje saliente
```

### **3. Enviar Mensaje Manual**

```
1. Usuario llama a POST /api/whatsapp/send
   ↓
2. Sistema llama a sendWhatsAppMessage()
   ↓
3. WAHA envía mensaje a WhatsApp
   ↓
4. Sistema guarda mensaje en BD (opcional)
```

---

## 🗄️ BASE DE DATOS

### **Tablas Relacionadas**

#### **1. `whatsapp_conversations`**
```sql
- id (UUID)
- organization_id (UUID)
- customer_phone (TEXT)
- customer_name (TEXT)
- is_bot_active (BOOLEAN)
- last_message_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **2. `whatsapp_messages`**
```sql
- id (UUID)
- conversation_id (UUID)
- organization_id (UUID)
- message_id (TEXT) -- ID del mensaje de WAHA
- direction (TEXT) -- 'incoming' | 'outgoing'
- from_number (TEXT)
- to_number (TEXT)
- body (TEXT)
- media_url (TEXT) -- URL del multimedia
- media_type (TEXT) -- 'image' | 'audio' | 'video' | 'document'
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### **3. `ai_agent_config`**
```sql
- id (UUID)
- organization_id (UUID)
- enabled (BOOLEAN)
- provider (TEXT) -- 'openai' | 'anthropic'
- model (TEXT) -- 'gpt-4o-mini', 'claude-3-haiku', etc.
- system_prompt (TEXT)
- personality (TEXT) -- 'profesional' | 'amigable' | 'formal'
- language (TEXT) -- 'es-MX', 'en-US', etc.
- temperature (FLOAT)
- max_tokens (INTEGER)
- policies (JSONB) -- Incluye waha_api_url y waha_api_key
- whatsapp_session_name (TEXT) -- Nombre de la sesión WAHA
- whatsapp_connected (BOOLEAN)
- whatsapp_phone (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## ✅ CARACTERÍSTICAS IMPLEMENTADAS

### **Recepción de Mensajes**
- ✅ Mensajes de texto
- ✅ Imágenes (con detección y almacenamiento)
- ✅ Audios (con detección y almacenamiento)
- ✅ Videos (con detección y almacenamiento)
- ✅ Documentos (con detección y almacenamiento)
- ✅ Filtrado de estados de WhatsApp
- ✅ Filtrado de grupos
- ✅ Deduplicación de mensajes

### **Envío de Mensajes**
- ✅ Mensajes de texto
- ⏳ Imágenes (no implementado aún)
- ⏳ Audios (no implementado aún)
- ⏳ Videos (no implementado aún)

### **Procesamiento con IA**
- ✅ Integración con OpenAI
- ✅ Integración con Anthropic
- ✅ Carga de contexto del taller
- ✅ Ejecución de funciones (agendar citas, consultar precios)
- ✅ Personalidad configurable
- ✅ Políticas y FAQs

### **Gestión de Sesiones**
- ✅ Creación automática de sesiones
- ✅ Generación de QR code
- ✅ Verificación de estado de conexión
- ✅ Actualización automática de webhook
- ✅ Multi-tenant (una sesión por organización)

---

## 🚀 PRÓXIMOS PASOS (Opcional)

### **Funcionalidades Pendientes**
- ⏳ Envío de imágenes desde el bot
- ⏳ Envío de audios desde el bot
- ⏳ Envío de videos desde el bot
- ⏳ Transcripción de audios con Whisper API
- ⏳ Análisis de imágenes con Vision API

---

## 📝 NOTAS IMPORTANTES

1. **Deduplicación**: El cache se limpia automáticamente cada 30 segundos
2. **Estados de WhatsApp**: Se ignoran automáticamente (`status@broadcast`)
3. **Multimedia**: Se descarga automáticamente si `downloadMedia: true` está configurado
4. **Webhook**: Solo debe tener `message` y `session.status` (NO `message.any`)
5. **Multi-tenant**: Cada organización tiene su propia sesión única

---

**Última actualización**: 2025-12-04
**Versión**: 1.0.0

