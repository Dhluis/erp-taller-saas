# CLAUDE.md

Instrucciones para Claude Code en este repositorio.

---

## Recuperación de Contexto — Inicio de Sesión

**Al iniciar una nueva conversación, dile a Claude:**

> "Estoy trabajando en [módulo]. Lee `docs/specs/[módulo].md` y `docs/PROJECT_STATUS.md` antes de empezar."

Si no sabes qué módulo: `"Lee CLAUDE.md y docs/specs/README.md para orientarte."`

**Módulos disponibles:** `auth-permissions`, `work-orders`, `invoices-quotations`, `inventory`, `customers-vehicles`, `purchases-suppliers`, `finances`, `whatsapp-communications`, `billing-plans`, `antifraude`

**Protocolo al terminar una sesión:**
> "Actualiza el spec del módulo que modificamos."

---

## Project Overview

**Eagles System ERP** — SaaS ERP multi-tenant para talleres mecánicos.
Stack: Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS + shadcn/ui.

**Estado:** Producción activa con clientes reales. Versión 5.0.0.

---

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check without emitting
npm run test         # Run Vitest
npm run diagnose     # type-check + test
npm run full-check   # type-check + test + build

npm run migrate      # Run database migrations
npm run env:check    # Verify environment variables
npm run sync-auth    # Sync Supabase auth users
```

---

## Architecture

### Multi-tenancy
Cada query **debe** incluir `organization_id`. 41+ tablas con RLS. Usar `getTenantContext(request)` en API routes. `workshop_id` es opcional (NULL permitido). Patrón RLS:
```sql
organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
```

### Data Access Layer
- Sin ORM — Supabase client directo con typed queries
- Queries por dominio en `src/lib/supabase/` y `src/lib/database/queries/`
- Usar **retry client** (`src/lib/supabase/retry-client.ts`) para manejar fallos de red
- Cache de 10 segundos en funciones de query

### Session & State
- `SessionContext` (`src/lib/context/SessionContext.tsx`) provee `user`, `organization_id`, `workshop_id` a todos los componentes via `useSession()`
- State global: React Context + Zustand; sidebar: `SidebarContext`
- Toast: **sonner** (`toast.success()`, `toast.error()`) — NO usar `useToast`

### Authentication
- Supabase Auth (email/contraseña, Google OAuth, magic link)
- Orden del middleware es crítica — no cambiar: `src/middleware.ts` → `src/lib/auth/middleware.ts`
- Session context se inicializa en `src/app/layout.tsx`

### Next.js 15 — Async Params
En route handlers, `params` es `Promise`. Siempre hacer await:
```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```

### API Routes
42+ rutas bajo `src/app/api/`. Todas validan `organization_id` de la sesión antes de operar.

### UI Conventions
- Componentes: PascalCase (`WorkOrderDetailsModal.tsx`)
- Hooks: prefijo `use` camelCase (`useWorkOrders.ts`)
- Utilidades: camelCase (`queries/orders.ts`)
- Tipos: PascalCase (`WorkOrder`, `OrderStatus`)
- Páginas: rutas en minúsculas (`app/ordenes/page.tsx`)
- Layout: `AppLayout` con `Sidebar` y `TopBar` de `src/components/layout/`

---

## Protected Areas — No Modificar Sin Autorización Explícita

### Absolutamente protegidos:
- **RLS policies** (`supabase/migrations/**/*.sql`) — auditoría de 5+ horas en 41 tablas. Nunca agregar "Enable all" ni eliminar políticas existentes.
- **Auth & session flow** — `src/middleware.ts`, `src/lib/context/SessionContext.tsx`, `src/lib/auth/middleware.ts`
- **WhatsApp AI Agent** — `src/integrations/whatsapp/services/ai-agent.ts`
- **WhatsApp utils** — `src/integrations/whatsapp/utils/index.ts` (parsers Twilio/Meta/Evolution, no eliminar)
- **Work orders route** — `src/app/api/work-orders/route.ts`

### Modificar solo con permiso:
- `src/components/ui/**` — base UI components
- `src/components/layout/**` — layout components
- `src/lib/database/**`, `src/lib/supabase/**` — data access layer
- `src/hooks/**`, `src/contexts/**`, `src/types/**`
- Config: `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `package.json`

---

## Integration Pattern

Al extender funcionalidad existente, **crear wrappers** en lugar de modificar archivos protegidos:

```typescript
// ✅ Correcto: wrapper en src/components/new/
import { WorkOrderDetailsModal } from '@/components/work-orders/WorkOrderDetailsModal';
export const EnhancedWorkOrderModal = ({ ... }) => { /* extender sin tocar el original */ };

// ❌ Incorrecto: modificar el original protegido directamente
```

Nuevos componentes y features → `src/components/new/` o `src/features-new/`.

---

## Integraciones Activas

| Servicio | Propósito | Notas |
|----------|-----------|-------|
| Supabase | BD + Auth + Storage | Principal |
| Twilio | WhatsApp Business | Webhooks por organización |
| Hotmart | Facturación SaaS | Sin Stripe |
| SendGrid | Email transaccional | |
| Upstash Redis | Rate limiting en login | Fail-open si no responde |
| Web Push (VAPID) | Push notifications | SW propio (`public/sw.js`) |

**WAHA fue completamente eliminado en Feb 2026.** Solo existe Twilio como proveedor de WhatsApp.

---

## Environment Variables

Requeridas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — admin operations que bypasan RLS

Opcionales: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `HOTMART_WEBHOOK_SECRET`, SendGrid keys, `UPSTASH_REDIS_REST_URL`, VAPID keys para push.

```bash
npm run env:check   # validar entorno antes de desarrollar
```

---

## Documentación de Referencia

- `docs/PROJECT_STATUS.md` — estado actual del proyecto, módulos implementados
- `docs/DEVELOPER_GUIDE.md` — reglas críticas, qué no tocar, cómo funciona cada área
- `docs/DATABASE_SCHEMA.md` — esquema completo de la BD
- `docs/API_ENDPOINTS_COMPLETE_LIST.md` — lista de endpoints
- `docs/specs/` — **specs vivos por módulo** (fuente de verdad por feature)

---

## Reglas de Documentación (SDD)

Al terminar de implementar algo:
1. Actualizar el spec del módulo afectado en `docs/specs/`
2. Si cambia la BD, actualizar `docs/DATABASE_SCHEMA.md`
3. Si cambia el estado del proyecto, actualizar `docs/PROJECT_STATUS.md`
4. **Nunca crear documentos de evento** (FIXES_*, DIAGNOSTICO_*, *_COMPLETE.md) — el código y git history son el registro

### Sub-agentes SDD de gentle-ai (opcional, no reemplaza lo anterior)

Este entorno tiene instalados los skills/agentes `sdd-*` de gentle-ai (orquestador de fases: explore/propose/spec/design/tasks/apply/verify/archive). Son una herramienta de orquestación **opt-in**, no el flujo por defecto de este proyecto:

- Úsalos solo para features grandes o riesgosas donde valga la pena el pipeline formal con fases separadas. Para un cambio chico (ej. una función utilitaria de pocas líneas), el pipeline completo es puro overhead — usa el protocolo simple de arriba.
- Para trabajo cotidiano, sigue el protocolo simple de arriba (leer spec → implementar → actualizar spec).
- **Elige Engram como artifact store en el preflight** (`sdd-init` / pregunta "Artifacts"), no OpenSpec. Verificado con `gentle-ai sdd-status`: si no se fija el modo, el dispatcher nativo resuelve a `openspec` por defecto, que crea archivos de fase (`proposal`/`spec`/`design`/`tasks`) en una carpeta `openspec/` en la raíz del repo — exactamente el tipo de documento de evento que este proyecto evita. En modo Engram no se crea ningún archivo, solo memoria.
- `.atl/` es solo el índice de skills (`skill-registry.md`), no los artefactos de fase — igual es scratch y no se commitea.
- Tanto `openspec/` como `.atl/` ya están en `.gitignore` como red de seguridad, pero el objetivo es que `openspec/` nunca llegue a crearse.
- Al terminar de usar el pipeline, vuelca el resultado final en `docs/specs/[modulo].md` — ni Engram ni `openspec/` reemplazan esa fuente de verdad para este proyecto.
