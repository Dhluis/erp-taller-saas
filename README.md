# ERP Taller SaaS

Sistema ERP para gestión de talleres mecánicos con integración de WhatsApp Business vía **Twilio**.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de Twilio (para WhatsApp Business API, opcional)

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar migraciones de base de datos
# (En Supabase SQL Editor, ejecutar archivos de supabase/migrations/)

# Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp (Twilio) - Opcional
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
```

**WhatsApp:** El envío y recepción de mensajes usa únicamente **Twilio WhatsApp Business API**. El número de WhatsApp por organización se configura en la tabla `organization_messaging_config` (campo `whatsapp_api_number` / número comprado en Twilio). No se usa otro proveedor para WhatsApp.

## 📚 Documentación

- [Estado del Proyecto](./docs/PROJECT_STATUS.md) - Estado actual y funcionalidades
- [Integración WhatsApp](./docs/WHATSAPP_INTEGRATION_STATUS.md) - Documentación de WhatsApp
- [Arquitectura](./docs/) - Documentación técnica

## 🏗️ Tecnologías

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Base de Datos:** Supabase (PostgreSQL)
- **Estilos:** Tailwind CSS
- **UI Components:** Radix UI
- **Autenticación:** Supabase Auth

## 📦 Estructura del Proyecto

```
src/
├── app/              # Next.js App Router
├── components/       # Componentes React
├── lib/              # Utilidades y helpers
├── hooks/            # Custom hooks
├── contexts/         # React Context
└── types/            # TypeScript types
```

## 🔐 Seguridad

- Row Level Security (RLS) activado en Supabase
- Autenticación mediante Supabase Auth
- Validación de tenant en todas las queries
- Variables de entorno para secretos

## 🚢 Deployment

El proyecto está configurado para deployment en Vercel:

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático desde branch `main`

## 📝 Licencia

Privado - Todos los derechos reservados

---

**Versión Estable:** Commit `773cb2a`  
**Última actualización:** Enero 2025

---

**Deploy:** Configurado para Vercel - Proyecto: `erp-taller-saas-correct`
