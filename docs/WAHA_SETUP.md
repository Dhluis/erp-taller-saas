# 📱 Guía de Configuración de WAHA (WhatsApp HTTP API)

## 🎯 ¿Qué es WAHA?

WAHA (WhatsApp HTTP API) es una solución open-source que permite generar códigos QR de coexistencia para WhatsApp, similar a Kommo o ManyChat. Permite recibir y enviar mensajes automáticamente sin necesidad de verificación de Meta.

## ✅ Ventajas de WAHA

- ✅ **Open-source y gratuito**
- ✅ **Genera QR de coexistencia directamente**
- ✅ **No requiere verificación de Meta**
- ✅ **Fácil de instalar y configurar**
- ✅ **API REST simple y documentada**
- ✅ **Soporta múltiples sesiones (múltiples números)**

---

## 🚀 Instalación

### Opción 1: Docker (Recomendado)

```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -v waha-sessions:/app/.sessions \
  devlikeapro/waha
```

### Opción 2: Docker Compose

Crea un archivo `docker-compose.yml`:

```yaml
version: '3.8'
services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    ports:
      - "3000:3000"
    volumes:
      - waha-sessions:/app/.sessions
    environment:
      - WAHA_LOG_LEVEL=info

volumes:
  waha-sessions:
```

Luego ejecuta:
```bash
docker-compose up -d
```

### Opción 3: NPM

```bash
npm install -g @devlikeapro/waha
waha
```

---

## ⚙️ Configuración en el ERP

### 1. Variables de Entorno

Agrega a tu `.env.local`:

```env
# WAHA Configuration
WAHA_API_URL=http://localhost:3000
# O si está en otro servidor:
# WAHA_API_URL=https://waha.tu-dominio.com
```

### 2. URL Pública (Para Webhooks)

Si WAHA está en un servidor diferente, también configura:

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## 🏢 Multi-Tenant: Cada Usuario Puede Vincular Su WhatsApp

El sistema está diseñado para permitir que **cada usuario pueda vincular su propio número de WhatsApp**, incluso dentro de la misma organización. Esto significa:

- ✅ Cada usuario genera su propio QR único
- ✅ Cada usuario tiene su propia sesión de WAHA
- ✅ Los mensajes se enrutan correctamente al usuario correspondiente
- ✅ Los administradores pueden ver todas las sesiones de su organización

### Estructura de Sesiones

Las sesiones se crean con el formato:
```
whatsapp_org_{organizationId}_user_{userId}
```

Esto garantiza que:
- Cada usuario tenga una sesión única
- No haya conflictos entre usuarios de la misma organización
- El sistema pueda identificar quién envió/recibió cada mensaje

## 📱 Uso

### 1. Iniciar Sesión de WhatsApp

Una vez que WAHA está ejecutándose:

1. Ve a `/dashboard/whatsapp`
2. Haz clic en "Vincular WhatsApp"
3. Selecciona la pestaña "Código QR"
4. Haz clic en "Generar QR Coexistencia (Business API)"
5. Se generará un código QR **único para tu usuario**
6. Escanea el QR con WhatsApp (Configuración → Dispositivos vinculados → Vincular dispositivo)
7. ¡Tu WhatsApp estará vinculado y listo para recibir/enviar mensajes!

### 2. Verificar Estado de la Sesión

Puedes verificar el estado de tu sesión haciendo:

```bash
curl http://localhost:3000/api/sessions
```

### 3. Enviar Mensajes

Una vez vinculado, puedes enviar mensajes desde tu ERP usando la API de WAHA o el sistema de AI Agent.

---

## 🔗 Endpoints de WAHA

### Generar QR
```http
GET /api/{sessionName}/auth/qr
```

### Iniciar Sesión
```http
POST /api/sessions/{sessionName}/start
```

### Estado de Sesión
```http
GET /api/sessions/{sessionName}/status
```

### Enviar Mensaje
```http
POST /api/{sessionName}/sendText
```

### Listar Sesiones
```http
GET /api/sessions
```

---

## 🤖 Integración con n8n (Automatización)

El sistema soporta automatización con **n8n** para crear flujos de trabajo personalizados.

### Configuración

Agrega a tu `.env.local`:

```env
# URL del webhook de n8n (opcional)
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/whatsapp
```

### Cómo Funciona

Cuando creas una sesión de WhatsApp, el sistema configura automáticamente:
1. **Webhook del ERP** - Procesamiento con AI Agent
2. **Webhook de n8n** (si está configurado) - Automatizaciones personalizadas

Ambos webhooks reciben los mensajes en paralelo, permitiendo:
- ✅ Procesamiento automático con AI Agent (ERP)
- ✅ Automatizaciones personalizadas (n8n)
- ✅ Integraciones con otros sistemas (n8n)

### Documentación Completa

Ver: `/docs/N8N_WAHA_INTEGRATION.md` para:
- Instalación de n8n
- Configuración de workflows
- Ejemplos de automatización
- Casos de uso comunes

---

## 🔐 Webhooks

WAHA puede enviar webhooks cuando recibe mensajes. El sistema está configurado para recibirlos en:

```
/api/whatsapp/webhook
```

Asegúrate de configurar el webhook en WAHA cuando creas la sesión.

---

## 📚 Documentación Completa

- **GitHub:** https://github.com/devlikeapro/waha
- **Documentación:** https://waha.devlike.pro/
- **API Reference:** https://waha.devlike.pro/docs/api

---

## 🆚 WAHA vs Evolution API vs Meta Business API

| Característica | WAHA | Evolution API | Meta Business API |
|---------------|------|---------------|-------------------|
| Precio | Gratis | Gratis | De pago según uso |
| Verificación Meta | No requerida | No requerida | Requerida |
| QR Coexistencia | ✅ Directo | ✅ Directo | ❌ Desde Manager |
| Instalación | Docker/NPM | Docker/NPM | Dashboard Meta |
| Open Source | ✅ | ✅ | ❌ |
| Escalabilidad | Alta | Alta | Muy Alta |
| Soporte | Comunidad | Comunidad | Oficial |

---

## 🐛 Troubleshooting

### Error: "Cannot connect to WAHA"
- Verifica que WAHA esté ejecutándose: `docker ps`
- Verifica la URL en `WAHA_API_URL`
- Verifica que el puerto sea correcto (por defecto 3000)

### QR no se genera
- Verifica los logs de WAHA: `docker logs waha`
- Verifica que la sesión se haya creado correctamente
- Intenta crear una nueva sesión

### QR expira muy rápido
- Los QR de WAHA expiran en ~60 segundos
- El sistema los renueva automáticamente
- Si expira, genera uno nuevo

---

## ✅ Checklist de Configuración

- [ ] WAHA instalado y ejecutándose
- [ ] `WAHA_API_URL` configurado en `.env.local`
- [ ] Puerto de WAHA accesible
- [ ] Webhook configurado (si usas webhooks)
- [ ] Probar generación de QR desde la interfaz
- [ ] Escanear QR con WhatsApp
- [ ] Verificar que la sesión esté activa

