# 📱 Guía de Integración con WhatsApp Business API

## 🎯 Resumen

Esta guía explica cómo configurar la integración real con WhatsApp Business API para que el código QR funcione completamente y puedas recibir y enviar mensajes automáticamente.

---

## 📋 Requisitos Previos

### 1. Cuenta de Meta Business
- Crea una cuenta en [Meta Business Suite](https://business.facebook.com)
- Verifica tu negocio
- Crea una aplicación en [Meta for Developers](https://developers.facebook.com)

### 2. WhatsApp Business API
- Solicita acceso a WhatsApp Business API
- Aprovecha el proceso de verificación de Meta
- Obtén un número de teléfono verificado

### 3. Variables de Entorno Necesarias

Agrega estas variables a tu `.env.local`:

```env
# WhatsApp Business API (Meta)
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_account_id
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_ACCESS_TOKEN=tu_access_token
WHATSAPP_APP_SECRET=tu_app_secret
WHATSAPP_VERIFY_TOKEN=tu_verify_token_personalizado
WHATSAPP_WEBHOOK_URL=https://tu-dominio.com/api/whatsapp/webhook
```

---

## 🔧 Configuración Paso a Paso

### Paso 1: Crear Aplicación en Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/apps/)
2. Click en "Crear App"
3. Selecciona "Business" como tipo
4. Completa la información de tu negocio
5. Agrega el producto "WhatsApp"

### Paso 2: Configurar WhatsApp Business API

1. En tu app, ve a "WhatsApp" → "Getting Started"
2. Obtén tu:
   - **Phone Number ID**: ID del número de teléfono
   - **Access Token**: Token temporal (necesitarás uno permanente)
   - **App Secret**: Secreto de la aplicación

### Paso 3: Configurar Webhook

1. En "WhatsApp" → "Configuration"
2. Configura el Webhook URL: `https://tu-dominio.com/api/whatsapp/webhook`
3. Configura el Verify Token (puede ser cualquier string seguro)
4. Suscríbete a los eventos:
   - `messages`
   - `message_status`

### Paso 4: Obtener Token Permanente

1. Ve a "WhatsApp" → "API Setup"
2. Genera un token permanente (System User Token)
3. Copia el token y guárdalo en `.env.local`

---

## 🔐 Variables de Entorno Completas

```env
# WhatsApp Business API
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_PHONE_NUMBER_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_APP_SECRET=tu_app_secret_aqui
WHATSAPP_VERIFY_TOKEN=tu_token_secreto_personalizado
WHATSAPP_WEBHOOK_URL=https://tu-dominio.com/api/whatsapp/webhook

# Opcional: Para usar WhatsApp Business API Cloud (alternativa)
WHATSAPP_CLOUD_API_URL=https://graph.facebook.com/v18.0
```

---

## 📡 Endpoints Necesarios

### 1. Webhook para recibir mensajes
**Ruta:** `/api/whatsapp/webhook`

Este endpoint:
- Recibe mensajes de WhatsApp
- Valida la firma de Meta
- Procesa los mensajes con el AI Agent
- Envía respuestas automáticas

### 2. Generar QR Code
**Ruta:** `/api/whatsapp/qr`

Este endpoint:
- Genera un código QR único
- Vincula el QR con la sesión de WhatsApp
- Retorna la imagen del QR

---

## 🚀 Implementación

### Opción A: WhatsApp Business API (Recomendado para Producción)

**Ventajas:**
- ✅ Integración oficial con Meta
- ✅ Escalable y confiable
- ✅ Soporte completo de funciones
- ✅ Analytics y métricas

**Desventajas:**
- ⚠️ Requiere aprobación de Meta
- ⚠️ Proceso de verificación más largo
- ⚠️ Puede tener costos según el plan

### Opción B: WhatsApp Click-to-Chat (Implementado Actualmente)

**Ventajas:**
- ✅ Funciona inmediatamente
- ✅ No requiere aprobación
- ✅ Gratis
- ✅ Fácil de implementar

**Desventajas:**
- ⚠️ Solo inicia conversaciones
- ⚠️ No recibe mensajes automáticamente
- ⚠️ Limitado a funcionalidades básicas

---

## 📝 Próximos Pasos

1. **Implementar Webhook Handler** (`/api/whatsapp/webhook`)
   - Validar firma de Meta
   - Procesar mensajes entrantes
   - Enviar respuestas con AI Agent

2. **Generar QR Real de WhatsApp Business**
   - Usar API de Meta para generar QR
   - Vincular con número de teléfono verificado
   - Mostrar QR en la interfaz

3. **Configurar Variables de Entorno**
   - Agregar todas las variables necesarias
   - Configurar webhook en Meta
   - Probar la integración

---

## 🔗 Recursos Útiles

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business API Cloud](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)

---

## ⚠️ Notas Importantes

1. **Seguridad**: Nunca expongas tus tokens en el código del cliente
2. **Rate Limits**: WhatsApp tiene límites de mensajes por segundo
3. **Verificación**: El proceso de verificación puede tardar varios días
4. **Costos**: Revisa los costos de WhatsApp Business API según tu uso

---

## ✅ Estado Actual

- ✅ QR Code básico (Click-to-Chat) - **IMPLEMENTADO**
- ⏳ Webhook Handler - **PENDIENTE**
- ⏳ Generación de QR con Meta API - **PENDIENTE**
- ⏳ Integración completa con WhatsApp Business API - **PENDIENTE**

