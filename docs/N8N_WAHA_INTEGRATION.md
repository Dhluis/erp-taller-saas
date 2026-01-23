# 🔄 Integración de n8n con WAHA y el ERP

## 🎯 Resumen

Esta guía explica cómo configurar n8n para automatizar flujos de trabajo de WhatsApp usando WAHA, manteniendo la integración con el ERP.

---

## 🏗️ Arquitectura

```
WhatsApp → WAHA → [ERP Webhook + n8n Webhook] → Procesamiento
```

### Flujo de Mensajes

1. **Cliente envía mensaje** → WAHA recibe
2. **WAHA envía webhook** a:
   - **ERP** (`/api/whatsapp/webhook`) - Procesamiento con AI Agent
   - **n8n** (webhook configurado) - Automatizaciones personalizadas
3. **Ambos procesan** el mensaje según su lógica

---

## 📋 Configuración

### 1. Variables de Entorno

Agrega a tu `.env.local`:

```env
# URL del webhook de n8n (opcional)
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/whatsapp
```

### 2. Instalar n8n

```bash
# Opción 1: Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Opción 2: NPM
npm install n8n -g
n8n start
```

### 3. Configurar n8n con WAHA

#### Crear Webhook en n8n

1. Abre n8n en `http://localhost:5678`
2. Crea un nuevo workflow
3. Agrega el nodo **Webhook**
4. Configura:
   - **HTTP Method**: POST
   - **Path**: `/webhook/whatsapp`
   - **Response Mode**: Respond When Last Node Finishes
5. Copia la URL del webhook (ej: `http://localhost:5678/webhook/whatsapp`)

#### Crear Workflow de Procesamiento

```
[Webhook] → [IF Node] → [Process Message] → [HTTP Request] → [Respond]
```

**Ejemplo de workflow:**

1. **Webhook Node** - Recibe mensajes de WAHA
2. **IF Node** - Filtra mensajes entrantes (solo procesar mensajes de tipo "text")
3. **Function Node** - Procesa el mensaje según tu lógica
4. **HTTP Request Node** - Opcional: Enviar respuesta al ERP
5. **Respond to Webhook Node** - Responde a WAHA

---

## 🔌 Endpoints Disponibles

### ERP Webhook (Procesamiento Directo)

**URL**: `/api/whatsapp/webhook`

**Payload que recibe:**
```json
{
  "session": "whatsapp_org_xxx_user_yyy",
  "payload": {
    "from": "1234567890",
    "to": "0987654321",
    "body": "Mensaje del cliente",
    "timestamp": "2025-01-XX",
    "messageId": "msg_123"
  }
}
```

**Procesa:**
- ✅ Mensajes con AI Agent
- ✅ Creación de clientes
- ✅ Consulta de órdenes
- ✅ Agendamiento de citas
- ✅ Respuestas automáticas

### n8n Webhook (Automatizaciones Personalizadas)

**URL**: Configurada en `N8N_WEBHOOK_URL`

**Payload que recibe:**
```json
{
  "event": "message",
  "session": "whatsapp_org_xxx_user_yyy",
  "payload": {
    "from": "1234567890",
    "to": "0987654321",
    "body": "Mensaje del cliente",
    "timestamp": "2025-01-XX",
    "messageId": "msg_123",
    "type": "text"
  }
}
```

**Puede procesar:**
- ✅ Automatizaciones personalizadas
- ✅ Integraciones con otros sistemas
- ✅ Lógica de negocio específica
- ✅ Respuestas condicionales
- ✅ Flujos complejos

---

## 🔄 Flujo Recomendado

### Opción 1: Procesamiento Paralelo

```
WhatsApp → WAHA → [ERP + n8n] (ambos reciben)
```

**Ventajas:**
- ✅ ERP procesa con AI Agent
- ✅ n8n maneja automatizaciones específicas
- ✅ Ambos funcionan independientemente

### Opción 2: Procesamiento Secuencial

```
WhatsApp → WAHA → n8n → ERP
```

**Configuración:**
1. n8n recibe el webhook primero
2. n8n procesa y decide si enviar al ERP
3. n8n hace HTTP Request al ERP si es necesario

---

## 📝 Ejemplos de Workflows en n8n

### Ejemplo 1: Filtrado de Mensajes

```javascript
// Function Node en n8n
const body = $input.item.json.body;

// Solo procesar si contiene palabras clave
const keywords = ['cotización', 'precio', 'cita'];
const containsKeyword = keywords.some(keyword => 
  body.toLowerCase().includes(keyword)
);

if (containsKeyword) {
  // Enviar al ERP para procesamiento con AI
  return {
    sendToERP: true,
    message: body
  };
}

return {
  sendToERP: false,
  message: body
};
```

### Ejemplo 2: Integración con Base de Datos Externa

```javascript
// Function Node
const message = $input.item.json.body;

// Consultar base de datos externa
// Procesar según lógica específica
// Enviar respuesta personalizada

return {
  response: "Respuesta desde n8n"
};
```

### Ejemplo 3: Notificaciones a Slack

```javascript
// Workflow:
// [Webhook] → [IF Node] → [Slack Node]

// Si el mensaje contiene "urgente"
if (message.includes('urgente')) {
  // Enviar notificación a Slack
  // Luego procesar normalmente
}
```

---

## 🔐 Identificación de Usuario y Organización

Cada mensaje incluye el `session` name que contiene:
- `organization_id` (extraído del nombre de sesión)
- `user_id` (extraído del nombre de sesión)

**Formato**: `whatsapp_org_{orgId}_user_{userId}`

### En n8n:

```javascript
// Function Node para extraer IDs
const session = $input.item.json.session;
const parts = session.split('_');
const orgId = parts[2]; // organization_id
const userId = parts[4]; // user_id

return {
  organization_id: orgId,
  user_id: userId,
  message: $input.item.json.body
};
```

---

## 📡 Webhook de WAHA

### Eventos Disponibles

- `message` - Mensaje recibido
- `message.any` - Cualquier tipo de mensaje
- `status` - Cambios de estado (entregado, leído, etc.)

### Payload Completo

```json
{
  "event": "message",
  "session": "whatsapp_org_xxx_user_yyy",
  "payload": {
    "from": "1234567890@s.whatsapp.net",
    "to": "0987654321@s.whatsapp.net",
    "body": "Mensaje del cliente",
    "timestamp": 1234567890,
    "messageId": "3EB0C767F26DE",
    "type": "text",
    "isGroup": false
  }
}
```

---

## 🔧 Variables de Entorno Completas

```env
# WAHA
WAHA_API_URL=http://localhost:3000

# n8n (Opcional)
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/whatsapp

# ERP
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## 🎯 Casos de Uso

### 1. Automatización de Respuestas Rápidas
- n8n detecta palabras clave
- Responde automáticamente con templates
- Solo mensajes complejos van al AI Agent

### 2. Integración con CRM Externo
- n8n recibe mensaje
- Consulta CRM externo
- Actualiza información
- Envía respuesta personalizada

### 3. Notificaciones Multi-Canal
- n8n recibe mensaje importante
- Envía notificación a Slack/Email/SMS
- Continúa procesamiento normal

### 4. Análisis de Sentimiento
- n8n analiza sentimiento del mensaje
- Si es negativo, alerta al equipo
- Si es positivo, registra feedback

---

## ✅ Checklist de Configuración

- [ ] WAHA instalado y ejecutándose
- [ ] n8n instalado y ejecutándose
- [ ] `N8N_WEBHOOK_URL` configurado en `.env.local`
- [ ] Webhook creado en n8n
- [ ] Workflow configurado en n8n
- [ ] Webhooks configurados en WAHA (automático al crear sesión)
- [ ] Probar recepción de mensajes en n8n
- [ ] Probar integración con ERP

---

## 📚 Recursos

- [n8n Documentation](https://docs.n8n.io/)
- [WAHA Documentation](https://waha.devlike.pro/)
- [n8n WAHA Node](https://github.com/devlikeapro/n8n-nodes-waha)

---

## 🔍 Troubleshooting

### n8n no recibe webhooks
- Verifica que `N8N_WEBHOOK_URL` sea accesible
- Verifica que el webhook en n8n esté activo
- Revisa los logs de WAHA

### Mensajes duplicados
- Normal si ambos webhooks están configurados
- Considera usar IF Node en n8n para filtrar

### Error en procesamiento
- Revisa logs de n8n
- Verifica formato del payload
- Asegúrate de que el workflow esté activo


























