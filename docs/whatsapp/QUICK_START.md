# 🚀 Quick Start - WhatsApp AI Agent (5 minutos)

## Checklist Rápido

### ✅ 1. Configurar Variables de Entorno (2 min)

```bash
# Ver variables requeridas en:
# docs/whatsapp/ENV_VARIABLES.md

# Crear .env.local y agregar:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY (o ANTHROPIC_API_KEY)
```

### ✅ 2. Instalar Dependencias (1 min)

```bash
npm install
# O si necesitas Anthropic:
npm install @anthropic-ai/sdk
```

### ✅ 3. Ejecutar Migraciones de Base de Datos (1 min)

```bash
# Ejecutar en Supabase SQL Editor:
# docs/whatsapp/database-schema.sql
```

### ✅ 4. Configurar WhatsApp Provider (1 min)

**Opción A: Twilio**
1. Crear cuenta en Twilio
2. Obtener Account SID y Auth Token
3. Configurar número de WhatsApp

**Opción B: Meta WhatsApp Business**
1. Crear app en Meta Developers
2. Obtener Phone Number ID y Access Token
3. Configurar webhook

**Opción C: Evolution API**
1. Configurar instancia de Evolution
2. Obtener API Key
3. Configurar webhook

### ✅ 5. Entrenar el Agente (1 min)

1. Ir a `/dashboard/whatsapp/train-agent`
2. Completar el wizard:
   - Información del negocio
   - Servicios
   - Políticas
   - Personalidad
   - FAQs
3. Probar en el chat de preview
4. Guardar configuración

## 🎯 Verificar que Todo Funciona

### Test Rápido

```bash
# 1. Health check
curl http://localhost:3000/api/whatsapp/test-agent

# 2. Probar mensaje
curl -X POST http://localhost:3000/api/whatsapp/test-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola"}'
```

### Desde el Dashboard

1. Ir a `/dashboard/whatsapp/train-agent`
2. Paso 7: Preview & Test
3. Escribir "Hola" en el chat
4. Verificar que el bot responde

## ⚠️ Problemas Comunes

| Problema | Solución |
|----------|----------|
| "AI Agent no configurado" | Completar el wizard en `/dashboard/whatsapp/train-agent` |
| "OpenAI API Key inválida" | Verificar `OPENAI_API_KEY` en `.env.local` |
| "Database connection failed" | Verificar variables de Supabase |
| "Webhook no válido" | Verificar configuración del provider |

## 📚 Siguiente Paso

Lee la **[Guía Completa de Testing](./TESTING_GUIDE.md)** para más detalles.

---

**¿Tienes problemas?** Revisa los logs en la consola del navegador y del servidor.

