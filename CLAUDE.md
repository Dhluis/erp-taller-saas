# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Eagles ERP** is a multi-tenant SaaS ERP system for automotive workshops. Built with Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL + Auth), and Tailwind CSS + shadcn/ui.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check without emitting
npm run test         # Run Vitest
npm run test:ui      # Vitest with UI
npm run test:coverage # Coverage report
npm run diagnose     # type-check + test
npm run full-check   # type-check + test + build

npm run migrate      # Run database migrations
npm run env:check    # Verify environment variables
npm run setup        # Initial setup script
npm run sync-auth    # Sync Supabase auth users
```

## Architecture

### Multi-tenancy
Every query **must** include `organization_id`. All 41+ database tables have Row Level Security (RLS) policies enforcing tenant isolation. Use `getTenantContext()` to get the current tenant's IDs. The `workshop_id` is optional (can be NULL). The RLS pattern is:
```sql
organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
```

### Data Access Layer
- **No ORM** — direct Supabase client with typed queries (`supabase.from('table').select()`)
- Query functions are organized by domain in `src/lib/supabase/` and `src/lib/database/queries/`
- Use the **retry client** (`src/lib/supabase/retry-client.ts`) for Supabase queries to handle network failures
- 10-second cache strategy is used in query functions

### Session & State
- `SessionContext` (`src/lib/context/SessionContext.tsx`) provides `user`, `organization_id`, and `workshop_id` to all components via `useSession()`
- Global state: React Context + Zustand; sidebar state: `SidebarContext`
- Toast notifications use **sonner** (`toast.success()`, `toast.error()`)

### Authentication
- **Supabase Auth** (email/password, OAuth/Google, magic link)
- Auth middleware order is critical — do not change: `src/middleware.ts` → `src/lib/auth/middleware.ts`
- Session context is initialized in `src/app/layout.tsx`

### API Routes
42+ Next.js API routes under `src/app/api/`. All routes validate `organization_id` from the session before performing any database operations.

### UI Conventions
- Components: PascalCase (`WorkOrderDetailsModal.tsx`)
- Hooks: `use` prefix camelCase (`useWorkOrders.ts`)
- Utilities: camelCase (`queries/orders.ts`)
- Types: PascalCase (`WorkOrder`, `OrderStatus`)
- Pages use lowercase route segments (`app/ordenes/page.tsx`)
- Layout: `AppLayout` with `Sidebar` and `TopBar` from `src/components/layout/`
- Breadcrumbs: `StandardBreadcrumbs` component

## Protected Areas — Do Not Modify Without Explicit Authorization

The following are stable and must not be changed unless explicitly asked:

- **WhatsApp integration** (`src/components/WhatsAppQRConnectorSimple.tsx`) — polling intervals are precisely tuned after 10+ hours of debugging. Never change them without measurement.
- **RLS policies** (`supabase/migrations/**/*.sql`) — 5+ hours of audit work across 41 tables. Never add "Enable all" policies or remove existing ones.
- **Auth & session flow** — `src/middleware.ts`, `src/lib/context/SessionContext.tsx`, `src/lib/auth/middleware.ts`

Other protected zones (modify only with permission):
- `src/components/ui/**` — base UI components
- `src/components/layout/**` — layout components
- `src/lib/database/**`, `src/lib/supabase/**` — data access layer
- `src/hooks/**`, `src/contexts/**`, `src/types/**`
- Config files: `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `package.json`

## Integration Pattern

When extending existing functionality, **create wrappers/adapters** instead of modifying protected files:

```typescript
// ✅ Correct: new wrapper in src/components/new/
import { WorkOrderDetailsModal } from '@/components/work-orders/WorkOrderDetailsModal';
export const EnhancedWorkOrderModal = ({ ... }) => { /* extend without touching original */ };

// ❌ Wrong: modifying the protected original directly
```

New components and features go in `src/components/new/` or `src/features-new/`.

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — required for admin operations that bypass RLS

Optional integrations: `WAHA_API_URL`, `WAHA_API_KEY` (WhatsApp), Stripe, MercadoPago, SendGrid, Twilio, Upstash Redis.

Run `npm run env:check` to validate the environment before development.
