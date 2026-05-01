# Confia Drive ERP — Documentación

**Versión:** 5.0.0 | **Stack:** Next.js 15, TypeScript, Supabase, Tailwind CSS, shadcn/ui
**Estado:** Producción estable | **Actualizado:** Abril 2026

---

## Índice

1. [Descripción](#descripción)
2. [Stack técnico](#stack-técnico)
3. [Instalación y desarrollo](#instalación-y-desarrollo)
4. [Variables de entorno](#variables-de-entorno)
5. [Arquitectura](#arquitectura)
6. [Módulos](#módulos)
7. [Comandos](#comandos)
8. [Documentos relacionados](#documentos-relacionados)

---

## Descripción

ERP SaaS multi-tenant para talleres mecánicos. Permite gestionar clientes, vehículos, órdenes de trabajo, inventario, cotizaciones, facturación, finanzas, compras, y comunicaciones (WhatsApp, email, push notifications), con billing mensual via Hotmart.

Cada organización tiene sus datos completamente aislados mediante Row Level Security (RLS) en todas las tablas de Supabase.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript (strict mode) |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email, Google OAuth, magic link) |
| Estilos | Tailwind CSS + shadcn/ui |
| Estado global | React Context + Hooks |
| Validación | Zod |
| Testing | Vitest |
| WhatsApp | Twilio |
| Email | SendGrid / SMTP (Nodemailer) |
| Billing | Hotmart |
| Push Notifications | Web Push (VAPID) |
| Rate Limiting | Upstash Redis |
| Despliegue | Vercel |

---

## Instalación y desarrollo

```bash
# Clonar
git clone <repo-url>
cd erp-taller-saas

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (ver sección de variables)

# Verificar variables
npm run env:check

# Ejecutar en desarrollo
npm run dev
```

El servidor inicia en `http://localhost:3000`.

---

## Variables de entorno

Ver [ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md) para la lista completa y actualizada.

Variables mínimas para desarrollo local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Arquitectura

### Multi-tenancy

Toda query a la base de datos **debe incluir `organization_id`**. Las 41+ tablas tienen RLS habilitado con el patrón:

```sql
organization_id IN (
  SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
)
```

En rutas API, obtener el contexto siempre con:

```typescript
const tenantContext = await getTenantContext(request)
// o
const supabase = createClientFromRequest(request)
const { data: { user } } = await supabase.auth.getUser()
```

### Acceso a datos

- No hay ORM — queries directas con el cliente Supabase tipado
- Funciones de dominio en `src/lib/database/queries/` y `src/lib/supabase/`
- Usar el **retry client** (`src/lib/supabase/retry-client.ts`) para tolerancia a fallos de red

### Sesión y estado

- `SessionContext` (`src/lib/context/SessionContext.tsx`) provee `user`, `organization_id`, `workshop_id`
- Acceder con `useSession()` desde cualquier componente cliente
- Notificaciones toast: **sonner** (`toast.success()`, `toast.error()`)

### Seguridad

- CORS con lista blanca de orígenes (no wildcard)
- HSTS + Referrer-Policy en next.config.js
- CSP en modo report-only (observando para activar enforced)
- Errores sanitizados en producción con `safeError()` de `@/lib/utils/api-error`
- Webhooks verificados con `crypto.timingSafeEqual()`

---

## Módulos

| Módulo | Ruta | Estado |
|---|---|---|
| Dashboard | `/dashboard` | ✅ KPIs financieros, órdenes, inventario |
| Órdenes de trabajo | `/ordenes` | ✅ Lista + Kanban + notificaciones |
| Clientes | `/clientes` | ✅ CRUD + historial |
| Vehículos | `/vehiculos` | ✅ CRUD + historial |
| Agenda/Citas | `/citas` | ✅ Funcional |
| Inventario | `/inventarios` | ✅ Productos, movimientos, alertas |
| Cotizaciones | `/cotizaciones` | ✅ Convertibles a orden o factura |
| Notas de venta | `/facturacion` | ✅ Con pagos parciales |
| Entradas/Salidas | `/ingresos` | ✅ Libro de movimientos |
| Cuentas de efectivo | `/ingresos/cuentas` | ✅ Efectivo, banco, tarjeta |
| Cobros | `/ingresos/cobros` | ✅ API real |
| Compras | `/compras` | ✅ Órdenes + proveedores + pagos |
| Reportes | `/reportes` | ✅ Ventas, inventario, financieros |
| WhatsApp | `/configuraciones/whatsapp` | ✅ Twilio |
| Usuarios e invitaciones | `/configuraciones/usuarios` | ✅ Con email |
| Configuración empresa | `/configuraciones` | ✅ |
| Mecánicos | `/mecanicos` | ✅ |
| Notificaciones | `/notificaciones` | ✅ |

---

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build producción
npm run lint         # ESLint
npm run type-check   # TypeScript sin emitir
npm run test         # Vitest
npm run test:ui      # Vitest con UI
npm run test:coverage # Cobertura
npm run diagnose     # type-check + test
npm run full-check   # type-check + test + build
npm run migrate      # Migraciones de BD
npm run env:check    # Verificar variables de entorno
npm run sync-auth    # Sincronizar usuarios de Supabase Auth
```

---

## Documentos relacionados

| Documento | Descripción |
|---|---|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Estado actual, módulos, deuda técnica |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Reglas críticas, patrones de código |
| [ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md) | Todas las variables de entorno |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Esquema de tablas |
| [API_ENDPOINTS_COMPLETE_LIST.md](./API_ENDPOINTS_COMPLETE_LIST.md) | Lista de endpoints |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guía de despliegue en Vercel |
| [PWA_IMPLEMENTATION.md](./PWA_IMPLEMENTATION.md) | PWA y push notifications |
| [GUIA_USUARIO_Y_AVANCE.md](./GUIA_USUARIO_Y_AVANCE.md) | Manual de usuario |
| [docs/twilio/](./twilio/) | Configuración de Twilio para WhatsApp |
