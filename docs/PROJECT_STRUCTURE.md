# 📋 ESTRUCTURA COMPLETA DEL PROYECTO

**Última actualización:** 2025-12-05  
**Propósito:** Documentación completa de la estructura del proyecto para evitar romper funcionalidades al modificar archivos.

---

## 📁 1. ESTRUCTURA DE CARPETAS PRINCIPALES

### Raíz del Proyecto
```
erp-taller-saas/
├── src/                    # Código fuente principal
├── supabase/               # Migraciones de base de datos
├── docs/                   # Documentación del proyecto
├── scripts/               # Scripts de utilidad
├── tests/                 # Tests del proyecto
├── public/                # Archivos estáticos
└── assets/                # Imágenes y recursos
```

### `/src` - Código Fuente Principal

#### `/src/app` - Next.js App Router
- **`(dashboard)/`** - Layout del dashboard
- **`api/`** - API Routes (ver sección 2)
- **`auth/`** - Páginas de autenticación (login, register, etc.)
- **`dashboard/`** - Dashboard principal y subpáginas
  - **`whatsapp/`** - Configuración y gestión de WhatsApp
    - **`train-agent/`** - Entrenamiento del agente AI
- **`ordenes/`** - Gestión de órdenes (Kanban y lista)
- **`ordenes-trabajo/`** - Gestión de órdenes de trabajo
- **`clientes/`** - Gestión de clientes
- **`vehiculos/`** - Gestión de vehículos
- **`inventarios/`** - Gestión de inventario
- **`citas/`** - Gestión de citas
- **`cotizaciones/`** - Gestión de cotizaciones
- **`facturacion/`** - Facturación
- **`compras/`** - Gestión de compras
- **`reportes/`** - Reportes y estadísticas
- **`configuraciones/`** - Configuración del sistema
- **`mecanicos/`** - Gestión de mecánicos
- **`notificaciones/`** - Notificaciones

#### `/src/components` - Componentes React
- **`auth/`** - Componentes de autenticación
- **`customers/`** - Componentes de clientes
- **`vehicles/`** - Componentes de vehículos
- **`inventory/`** - Componentes de inventario
- **`work-orders/`** - Componentes de órdenes de trabajo
- **`ordenes/`** - Componentes de órdenes (Kanban, modales)
- **`dashboard/`** - Componentes del dashboard
- **`layout/`** - Componentes de layout (Header, Sidebar, etc.)
- **`ui/`** - Componentes UI reutilizables (Button, Card, Dialog, etc.)
- **`whatsapp/`** - Componentes de WhatsApp
- **`providers/`** - Providers de contexto

#### `/src/lib` - Librerías y Utilidades
- **`api/`** - Funciones de API y migraciones
- **`auth/`** - Utilidades de autenticación
- **`context/`** - Contextos (SessionContext)
- **`core/`** - Funciones core (multi-tenant, supabase)
- **`database/`** - Queries de base de datos
  - **`queries/`** - Funciones de consulta específicas
- **`supabase/`** - Clientes y utilidades de Supabase
- **`types/`** - Definiciones de tipos
- **`utils/`** - Utilidades generales
- **`validations/`** - Validaciones
- **`waha-sessions.ts`** - ⚠️ CRÍTICO: Gestión de sesiones WAHA

#### `/src/integrations` - Integraciones Externas
- **`whatsapp/`** - ⚠️ CRÍTICO: Integración de WhatsApp
  - **`adapters/`** - Adapters para conectar con código existente
    - `citas-adapter.ts` - Adapter para citas
    - `clientes-adapter.ts` - Adapter para clientes
    - `ordenes-adapter.ts` - Adapter para órdenes
  - **`services/`** - Servicios del bot AI
    - `ai-agent.ts` - ⚠️ CRÍTICO: Servicio principal del AI Agent
    - `context-loader.ts` - ⚠️ CRÍTICO: Carga contexto para el AI
    - `function-executor.ts` - ⚠️ CRÍTICO: Ejecuta funciones del AI
    - `waha-service.ts` - Servicio de WAHA
  - **`types/`** - Tipos específicos de WhatsApp
  - **`utils/`** - Utilidades de WhatsApp

#### `/src/hooks` - Hooks Personalizados
- `useAuth.ts` - Hook de autenticación (wrapper de SessionContext)
- `useCustomers.ts` - Hook para clientes
- `useVehicles.ts` - Hook para vehículos
- `useWorkOrders.ts` - Hook para órdenes de trabajo
- `useInventory.ts` - Hook para inventario
- `useDashboard.ts` - Hook para dashboard
- `useNotifications.ts` - Hook para notificaciones
- `useQuotations.ts` - Hook para cotizaciones
- `useBilling.ts` - Hook para facturación
- `useEmployees.ts` - Hook para empleados
- `useSuppliers.ts` - Hook para proveedores
- `useKPIs.ts` - Hook para KPIs
- `useOptimizedCalculations.ts` - Hooks de optimización
- `useGlobalSearch.ts` - Hook para búsqueda global
- `useTheme.ts` - Hook para tema
- `useToast.ts` - Hook para toasts
- `use-user-profile.ts` - Hook para perfil de usuario

#### `/src/contexts` - Context Providers
- **`SessionContext.tsx`** - ⚠️ CRÍTICO: Contexto de sesión unificado
- **`AuthContext.tsx`** - Contexto de autenticación (legacy, usar SessionContext)
- **`OrganizationContext.tsx`** - Contexto de organización (legacy, usar SessionContext)
- **`SidebarContext.tsx`** - Contexto del sidebar

#### `/src/types` - Definiciones de Tipos
- `base.ts` - Tipos base
- `database.ts` - Tipos de base de datos
- `entities.ts` - Entidades
- `orders.ts` - Tipos de órdenes
- `supabase.ts` - Tipos de Supabase
- `supabase-simple.ts` - Tipos simplificados de Supabase

---

## ⚠️ 2. ARCHIVOS CRÍTICOS DE WHATSAPP/AI (NO MODIFICAR SIN CUIDADO)

### 2.1 `/src/app/api/webhooks/whatsapp/route.ts`
**Propósito:** Endpoint principal que recibe eventos de WAHA (WhatsApp HTTP API)

**Funcionalidad:**
- Recibe eventos de WAHA: `message`, `session.status`, `message.reaction`
- Filtra mensajes propios, grupos y estados de WhatsApp
- Extrae `organizationId` del nombre de sesión
- Busca/crea conversación en BD
- Guarda mensaje entrante en `whatsapp_messages`
- Si bot activo, procesa con AI Agent
- Envía respuesta si hay
- Guarda mensaje saliente

**Funciones principales:**
- `handleMessageEvent()` - Procesa mensajes entrantes
- `handleSessionStatusEvent()` - Actualiza estado de conexión
- `handleReactionEvent()` - Maneja reacciones (solo log)
- `getOrCreateConversation()` - Busca/crea conversación
- `saveIncomingMessage()` - Guarda mensaje entrante
- `saveOutgoingMessage()` - Guarda mensaje saliente
- `extractPhoneNumber()` - Extrae número de teléfono

**Dependencias:**
- `@/lib/waha-sessions` - `getOrganizationFromSession`, `sendWhatsAppMessage`, `getProfilePicture`
- `@/lib/supabase/server` - `getSupabaseServiceClient`
- `@/integrations/whatsapp/services/ai-agent` - `processMessage`

**⚠️ NO MODIFICAR:**
- La lógica de deduplicación de mensajes (constraint UNIQUE en BD)
- El filtrado de mensajes propios y grupos
- La extracción de `organizationId` desde sesión

---

### 2.2 `/src/lib/waha-sessions.ts`
**Propósito:** Gestión de sesiones de WhatsApp para cada organización usando WAHA Plus

**Funciones exportadas:**
1. **`generateSessionName(organizationId: string): string`**
   - Genera nombre único de sesión: `eagles_<orgId sin guiones, primeros 20 caracteres>`
   - ⚠️ NO cambiar el formato sin actualizar todas las sesiones existentes

2. **`getWahaConfig(organizationId?: string): Promise<{ url: string; key: string }>`**
   - Obtiene configuración WAHA desde:
     1. Variables de entorno (`WAHA_API_URL`, `WAHA_API_KEY`)
     2. BD: `ai_agent_config.policies` (por organizationId)
     3. BD: Cualquier registro que tenga la config
   - ⚠️ CRÍTICO: Esta función es usada por TODAS las funciones de WAHA

3. **`startSession(sessionName: string, organizationId?: string): Promise<void>`**
   - Inicia/reinicia una sesión existente

4. **`createOrganizationSession(organizationId: string): Promise<string>`**
   - Crea sesión nueva para una organización
   - Configura webhook automáticamente
   - Guarda nombre de sesión en `ai_agent_config.whatsapp_session_name`

5. **`updateSessionWebhook(sessionName: string, organizationId?: string): Promise<void>`**
   - Actualiza configuración del webhook de una sesión existente

6. **`getOrganizationFromSession(sessionName: string): Promise<string | null>`**
   - ⚠️ CRÍTICO: Obtiene `organizationId` desde nombre de sesión
   - Usado por el webhook para identificar la organización
   - Consulta: `ai_agent_config.whatsapp_session_name = sessionName`

7. **`getOrganizationSession(organizationId: string): Promise<string>`**
   - Obtiene sesión de una organización (crea si no existe)
   - Verifica que la sesión exista en WAHA antes de retornarla

8. **`getSessionStatus(sessionName: string, organizationId?: string): Promise<{...}>`**
   - Obtiene estado de sesión desde WAHA
   - Retorna: `exists`, `status`, `me` (info del usuario conectado)

9. **`getSessionQR(sessionName: string, organizationId?: string): Promise<any>`**
   - Obtiene QR code para escanear

10. **`logoutSession(sessionName: string, organizationId?: string): Promise<void>`**
    - Cierra sesión (logout sin eliminar)

11. **`sendWhatsAppMessage(sessionName: string, to: string, text: string, organizationId?: string): Promise<any>`**
    - ⚠️ CRÍTICO: Envía mensaje de WhatsApp
    - Verifica estado de sesión antes de enviar
    - Reintenta si la sesión está en estado inválido
    - Formatea número al formato WhatsApp (`@c.us`)

12. **`getProfilePicture(phone: string, sessionName: string, organizationId: string): Promise<string | null>`**
    - Obtiene foto de perfil de un contacto

**Dependencias:**
- `@/lib/supabase/server` - `getSupabaseServiceClient`
- Variables de entorno: `WAHA_API_URL`, `WAHA_API_KEY`
- BD: Tabla `ai_agent_config`

**⚠️ NO MODIFICAR:**
- El formato del nombre de sesión (`eagles_<orgId>`)
- La lógica de obtención de `organizationId` desde sesión
- La configuración del webhook (debe apuntar a `/api/webhooks/whatsapp`)

---

### 2.3 `/src/integrations/whatsapp/services/ai-agent.ts`
**Propósito:** Servicio principal del AI Agent que procesa mensajes y genera respuestas

**Funcionalidad:**
- Soporta múltiples providers: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude)
- Carga contexto de la organización
- Construye system prompt dinámico
- Maneja function calling (si está habilitado)
- Procesa mensajes con AI
- Ejecuta funciones solicitadas por el AI
- Genera respuestas naturales

**Función principal:**
- **`processMessage(params): Promise<{ success: boolean; response?: string; error?: string }>`**
  - Parámetros:
    - `organizationId`: ID de la organización
    - `conversationId`: ID de la conversación
    - `customerMessage`: Mensaje del cliente
    - `customerPhone`: Teléfono del cliente
    - `useServiceClient`: Usar service client (bypass RLS)

**Flujo interno:**
1. Carga configuración AI desde `ai_agent_config`
2. Carga contexto usando `loadAIContext()`
3. Construye system prompt usando `buildSystemPrompt()`
4. Obtiene historial de conversación usando `getConversationHistory()`
5. Si `auto_schedule_appointments` está activo, agrega funciones de agendamiento
6. Llama a OpenAI/Anthropic con el mensaje
7. Si el AI solicita una función, ejecuta usando `executeFunction()`
8. Hace segunda llamada al AI con resultado de función
9. Retorna respuesta final

**Dependencias:**
- `./context-loader` - `loadAIContext`, `getAIConfig`, `getConversationHistory`, `buildSystemPrompt`
- `./function-executor` - `executeFunction`
- `../types` - `AIFunctionCall`
- Variables de entorno: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (opcional)

**⚠️ NO MODIFICAR:**
- La lógica de function calling (es compleja y crítica)
- El formato del system prompt (afecta el comportamiento del bot)
- La carga de contexto (debe ser consistente)

---

### 2.4 `/src/integrations/whatsapp/services/context-loader.ts`
**Propósito:** Carga y construye el contexto que el AI Agent necesita para responder

**Funciones exportadas:**
1. **`loadAIContext(organizationId, conversationId, useServiceClient?): Promise<AIContext | null>`**
   - Carga configuración desde `ai_agent_config`
   - Carga información de organización desde `organizations`
   - Construye objeto `AIContext` con:
     - `organization_id`, `organization_name`
     - `services` (desde `ai_agent_config.services`)
     - `mechanics` (desde `ai_agent_config.mechanics`)
     - `business_hours` (desde `ai_agent_config.business_hours`)
     - `policies` (desde `ai_agent_config.policies`)
     - `faqs` (desde `ai_agent_config.faqs`)
     - `contact_info` (desde `organizations`)

2. **`getAIConfig(organizationId, useServiceClient?): Promise<AIAgentConfig | null>`**
   - Obtiene configuración completa del AI Agent

3. **`getConversationHistory(conversationId, limit?): Promise<Array>`**
   - Obtiene historial de mensajes de la conversación
   - Formatea para OpenAI (role: user/assistant)

4. **`buildSystemPrompt(config, context): string`**
   - ⚠️ CRÍTICO: Construye el system prompt que define el comportamiento del bot
   - Incluye información de la organización, servicios, horarios, políticas
   - Si `auto_schedule_appointments` está activo, agrega instrucciones de funciones
   - Define personalidad y tono del bot

5. **`isWithinBusinessHours(date, businessHours): boolean`**
   - Verifica si una fecha/hora está dentro de horarios de atención

**Dependencias:**
- `../utils/supabase-server-helpers` - `getSupabaseServerClient`
- `../types` - `AIContext`, `AIAgentConfig`
- BD: Tablas `ai_agent_config`, `organizations`, `whatsapp_messages`

**⚠️ NO MODIFICAR:**
- La estructura del objeto `AIContext` (usado en múltiples lugares)
- El formato del system prompt (afecta comportamiento del bot)

---

### 2.5 `/src/integrations/whatsapp/services/function-executor.ts`
**Propósito:** Ejecuta las funciones que el AI Agent solicita mediante function calling

**Funciones ejecutables:**
1. **`create_appointment_request`** - Crea solicitud de cita
   - Verifica disponibilidad primero
   - Valida horarios de negocio
   - Verifica conflictos con citas existentes
   - Crea en `appointment_requests` con status `pending` o `approved`

2. **`check_availability`** - Verifica disponibilidad para una fecha
   - Consulta `business_hours`
   - Consulta `appointments` y `appointment_requests`
   - Retorna horarios disponibles y ocupados

3. **`get_services_info`** - Obtiene información de servicios
   - Filtra por `service_name` si se proporciona
   - Retorna nombre, precio, duración, descripción

4. **`schedule_appointment`** - (Legacy) Agenda cita directamente
   - Usa `citasAdapter.createAppointmentFromBot()`

5. **`get_service_price`** - Consulta precio de servicio
   - Usa `citasAdapter.getServicePrice()`

6. **`create_quote`** - Crea cotización
   - Usa `ordenesAdapter.createOrderFromBot()`

**Función principal:**
- **`executeFunction(functionCall, organizationId, conversationId, customerPhone): Promise<any>`**
  - Ejecuta la función solicitada por el AI
  - Retorna resultado en formato estándar

**Dependencias:**
- `../adapters/citas-adapter` - `citasAdapter`
- `../adapters/ordenes-adapter` - `ordenesAdapter`
- `../adapters/clientes-adapter` - `clientesAdapter`
- `./context-loader` - `loadAIContext`
- BD: Tablas `appointment_requests`, `appointments`, `ai_agent_config`

**⚠️ NO MODIFICAR:**
- Los nombres de las funciones (deben coincidir con los definidos en `ai-agent.ts`)
- El formato de retorno (debe ser consistente para el AI)

---

### 2.6 `/src/integrations/whatsapp/services/waha-service.ts`
**Propósito:** Servicio para interactuar con WAHA (WhatsApp HTTP API)

**Funciones exportadas:**
- `formatPhoneNumber(phone): string` - Formatea número al formato WhatsApp
- `getWAHAConfig(organizationId?): Promise<{ url, key }>` - Obtiene configuración WAHA
- Funciones de sesión: `createSession`, `getSession`, `deleteSession`
- Funciones de QR: `getQRCode`
- Funciones de conexión: `checkConnectionStatus`
- Funciones de mensajes: `sendTextMessage`, `sendImage`, `sendFile`
- Funciones de sesión: `disconnectSession`, `deleteSession`

**⚠️ NOTA:** Este archivo parece ser una versión alternativa/legacy. El código principal usa `/src/lib/waha-sessions.ts`.

---

### 2.7 `/src/integrations/whatsapp/adapters/` - Adapters
**Propósito:** Conectan el bot de WhatsApp con el código existente sin modificarlo

#### `citas-adapter.ts`
- **Funciones:**
  - `checkAvailability()` - Verifica disponibilidad
  - `createAppointmentFromBot()` - Crea cita desde bot
  - `getServicePrice()` - Obtiene precio de servicio
- **Dependencias:**
  - `@/lib/supabase/appointments` - Funciones de citas existentes
- **⚠️ NO MODIFICAR:** Los adapters deben mantener compatibilidad con el código existente

#### `clientes-adapter.ts`
- **Funciones:**
  - `findCustomerByPhone()` - Busca cliente por teléfono
  - `createCustomerFromBot()` - Crea cliente desde bot
  - `getCustomerInfo()` - Obtiene info de cliente
- **Dependencias:**
  - `@/lib/database/queries/customers` - Funciones de clientes existentes

#### `ordenes-adapter.ts`
- **Funciones:**
  - `createOrderFromBot()` - Crea orden desde bot
  - `getOrderStatus()` - Obtiene estado de orden
- **Dependencias:**
  - `@/lib/database/queries/work-orders` - Funciones de órdenes existentes

---

### 2.8 `/src/integrations/whatsapp/types/index.ts`
**Propósito:** Define todos los tipos TypeScript para la integración de WhatsApp

**Tipos principales:**
- `WhatsAppProvider` - Provider usado (actualmente solo 'waha')
- `WhatsAppMessage` - Estructura de mensaje
- `WhatsAppConversation` - Estructura de conversación
- `AIAgentConfig` - Configuración del AI Agent
- `AIContext` - Contexto cargado para el AI
- `AIFunctionName` - Nombres de funciones disponibles
- `AIFunctionCall` - Llamada a función del AI
- `AdapterResponse<T>` - Formato de respuesta de adapters

**⚠️ NO MODIFICAR:**
- Los nombres de funciones en `AIFunctionName` (deben coincidir con `function-executor.ts`)
- La estructura de `AIContext` (usada en múltiples lugares)

---

## 🔗 3. DEPENDENCIAS ENTRE ARCHIVOS

### 3.1 Flujo del Webhook de WhatsApp

```
WAHA → /api/webhooks/whatsapp/route.ts
  ↓
handleMessageEvent()
  ↓
getOrganizationFromSession() [waha-sessions.ts]
  ↓
getOrCreateConversation()
  ↓
saveIncomingMessage() → BD: whatsapp_messages
  ↓
processMessage() [ai-agent.ts]
  ↓
loadAIContext() [context-loader.ts]
  ↓
buildSystemPrompt() [context-loader.ts]
  ↓
getConversationHistory() [context-loader.ts]
  ↓
OpenAI API Call
  ↓
(If function_call) executeFunction() [function-executor.ts]
  ↓
  ├─ createAppointmentRequest() → BD: appointment_requests
  ├─ checkAvailability() → BD: appointments, appointment_requests
  ├─ getServicesInfo() → ai_agent_config.services
  └─ createQuote() → ordenesAdapter → BD: work_orders
  ↓
OpenAI API Call (segunda vez con resultado de función)
  ↓
sendWhatsAppMessage() [waha-sessions.ts]
  ↓
saveOutgoingMessage() → BD: whatsapp_messages
```

### 3.2 Dependencias de Importación

#### Archivos que importan `waha-sessions.ts`:
- `/api/webhooks/whatsapp/route.ts`
- `/app/dashboard/whatsapp/page.tsx`
- `/app/api/whatsapp/*/route.ts` (varios endpoints)

#### Archivos que importan `ai-agent.ts`:
- `/api/webhooks/whatsapp/route.ts` (único lugar)

#### Archivos que importan `context-loader.ts`:
- `ai-agent.ts`
- `function-executor.ts`

#### Archivos que importan `function-executor.ts`:
- `ai-agent.ts` (único lugar)

#### Archivos que importan los adapters:
- `function-executor.ts`

### 3.3 Funciones Usadas por Múltiples Archivos

#### `getOrganizationId()` (desde `@/lib/auth/organization-server`)
**Usado en:**
- Todas las API routes que necesitan `organizationId`
- Queries de base de datos
- Funciones de multi-tenant

**⚠️ CRÍTICO:** Esta función debe funcionar correctamente o TODO el sistema multi-tenant falla.

#### `getSupabaseServiceClient()` (desde `@/lib/supabase/server`)
**Usado en:**
- API routes
- Webhooks
- Funciones que necesitan bypass RLS

#### `getSupabaseServerClient()` (desde `@/lib/supabase/server`)
**Usado en:**
- Server components
- API routes (cuando no se necesita bypass RLS)

#### `createClient()` (desde `@/lib/supabase/client`)
**Usado en:**
- Client components
- Hooks del cliente

### 3.4 Funciones Duplicadas o con Nombres Similares

#### ⚠️ PROBLEMA: Múltiples formas de obtener Supabase client
1. `getSupabaseServiceClient()` - `/lib/supabase/server` (bypass RLS)
2. `getSupabaseServerClient()` - `/lib/supabase/server` (con RLS)
3. `createClient()` - `/lib/supabase/client` (cliente del navegador)
4. `getSupabaseClient()` - `/integrations/whatsapp/utils/supabase-helpers` (wrapper)
5. `getSupabaseServerClient()` - `/integrations/whatsapp/utils/supabase-server-helpers` (wrapper)

**Recomendación:** Usar siempre las funciones de `/lib/supabase/server` o `/lib/supabase/client` directamente.

#### ⚠️ PROBLEMA: Múltiples formas de obtener organizationId
1. `getOrganizationId()` - `/lib/auth/organization-server` (servidor)
2. `getOrganizationId()` - `/lib/auth/organization-client` (cliente)
3. `useOrganizationId()` - Hook desde `SessionContext`
4. `getOrganizationFromSession()` - `/lib/waha-sessions` (específico para WhatsApp)

**Recomendación:** 
- En servidor: usar `@/lib/auth/organization-server`
- En cliente: usar `useOrganizationId()` hook
- Para WhatsApp: usar `getOrganizationFromSession()`

---

## 🎣 4. CONTEXTOS Y HOOKS

### 4.1 Context Providers

#### `SessionContext` (`/src/lib/context/SessionContext.tsx`)
**⚠️ CONTEXTO PRINCIPAL - Usar este en lugar de AuthContext/OrganizationContext**

**Estado expuesto:**
- `user: User | null` - Usuario autenticado
- `organizationId: string | null` - ID de organización
- `workshopId: string | null` - ID de taller
- `profile: any | null` - Perfil del usuario
- `workshop: any | null` - Información del taller
- `isLoading: boolean` - Estado de carga
- `isReady: boolean` - Si la sesión está lista
- `error: string | null` - Error si hay

**Funciones:**
- `refresh(): Promise<void>` - Refrescar sesión
- `signOut(): Promise<void>` - Cerrar sesión

**Hooks exportados:**
- `useSession()` - Hook principal
- `useAuth()` - Wrapper de compatibilidad
- `useOrganization()` - Wrapper de compatibilidad

**Dependencias:**
- `@/lib/supabase/client` - `createClient()`
- BD: Tablas `users`, `workshops`

**⚠️ NO MODIFICAR:**
- La lógica de carga de sesión (es compleja y crítica)
- El debounce de eventos SIGNED_IN (evita recargas múltiples)

---

#### `AuthContext` (`/src/contexts/AuthContext.tsx`)
**⚠️ LEGACY - Usar SessionContext en su lugar**

**Estado:** Similar a SessionContext pero con estructura diferente

**Uso actual:** Algunos componentes antiguos todavía lo usan

**Recomendación:** Migrar gradualmente a `SessionContext`

---

#### `OrganizationContext` (`/src/contexts/OrganizationContext.tsx`)
**⚠️ LEGACY - Usar SessionContext en su lugar**

**Estado:** Solo información de organización

**Uso actual:** Muy limitado

**Recomendación:** Migrar a `SessionContext`

---

#### `SidebarContext` (`/src/contexts/SidebarContext.tsx`)
**Propósito:** Estado del sidebar (colapsado/expandido)

**Estado:**
- `isCollapsed: boolean`
- `toggleCollapse: () => void`

**Uso:** Solo para UI del sidebar

---

### 4.2 Hooks Personalizados

#### Hooks de Autenticación
- **`useAuth()`** - Wrapper de `SessionContext.useAuth()`
- **`useSession()`** - Hook principal de `SessionContext`
- **`useOrganizationId()`** - Obtiene `organizationId` desde `SessionContext`
- **`useIsAuthenticated()`** - Verifica si usuario está autenticado
- **`useUserData()`** - Obtiene datos completos del usuario

#### Hooks de Datos
- **`useCustomers()`** - Gestión de clientes
  - Depende de: `useOrganizationId()`, `@/lib/database/queries/customers`
- **`useVehicles()`** - Gestión de vehículos
  - Depende de: `useOrganizationId()`, `@/lib/database/queries/vehicles`
- **`useWorkOrders()`** - Gestión de órdenes de trabajo
  - Depende de: `/api/work-orders`
- **`useInventory()`** - Gestión de inventario
  - Depende de: `useOrganizationId()`, `@/lib/database/queries/inventory`
- **`useEmployees()`** - Gestión de empleados
  - Depende de: `useOrganizationId()`, `@/lib/database/queries/employees`
- **`useSuppliers()`** - Gestión de proveedores
  - Depende de: `useOrganizationId()`
- **`useQuotations()`** - Gestión de cotizaciones
  - Depende de: `useOrganizationId()`
- **`useBilling()`** - Gestión de facturación
  - Depende de: `useOrganizationId()`

#### Hooks de UI/Utilidades
- **`useDashboard()`** - Datos del dashboard
  - Depende de: `useOrganizationId()`, `/api/orders/stats`
- **`useNotifications()`** - Notificaciones
  - Depende de: `useOrganizationId()`, `@/lib/notifications/service`
- **`useGlobalSearch()`** - Búsqueda global
  - Depende de: `useOrganizationId()`
- **`useTheme()`** - Tema de la aplicación
- **`useToast()`** - Toasts/notificaciones toast
- **`useKPIs()`** - KPIs del dashboard
  - Depende de: `useOrganizationId()`, `/api/kpis/*`

#### Hooks de Optimización
- **`useOptimizedCalculations()`** - Cálculos optimizados
- **`useOptimizedCallbacks()`** - Callbacks memoizados
- **`useOptimizedFilters()`** - Filtros optimizados
- **`useOptimizedPagination()`** - Paginación optimizada
- **`useOptimizedSorting()`** - Ordenamiento optimizado
- **`useOptimizedDebounce()`** - Debounce optimizado

### 4.3 Dependencias entre Hooks

```
useSession() [SessionContext]
  ↓
useOrganizationId()
  ↓
├─ useCustomers()
├─ useVehicles()
├─ useInventory()
├─ useEmployees()
├─ useSuppliers()
├─ useQuotations()
├─ useBilling()
├─ useDashboard()
├─ useNotifications()
└─ useKPIs()
```

**⚠️ IMPORTANTE:** Todos los hooks de datos dependen de `organizationId` estar disponible. Si `organizationId` es `null`, los hooks no cargarán datos.

---

## 📝 5. TIPOS E INTERFACES

### 5.1 Ubicación de Tipos

#### `/src/types/` - Tipos Generales
- **`base.ts`** - Tipos base del sistema
- **`database.ts`** - Tipos generados de Supabase
- **`entities.ts`** - Entidades del dominio
- **`orders.ts`** - Tipos específicos de órdenes
- **`supabase.ts`** - Tipos de Supabase (completos)
- **`supabase-simple.ts`** - Tipos simplificados de Supabase

#### `/src/integrations/whatsapp/types/index.ts` - Tipos de WhatsApp
- Todos los tipos relacionados con WhatsApp y AI Agent
- **⚠️ NO duplicar estos tipos en otros lugares**

#### `/src/lib/types/work-orders.ts` - Tipos de Órdenes de Trabajo
- `WorkOrderNote` - Notas de órdenes
- `NoteCategory` - Categorías de notas

### 5.2 Tipos Duplicados o Inconsistentes

#### ⚠️ PROBLEMA: Múltiples definiciones de `WorkOrder`
1. `/src/types/orders.ts` - Definición principal
2. `/src/hooks/useWorkOrders.ts` - Interface `WorkOrder` (puede diferir)
3. `/src/lib/database/queries/work-orders.ts` - Tipo `WorkOrder` (puede diferir)

**Recomendación:** Usar siempre `/src/types/orders.ts` como fuente de verdad.

#### ⚠️ PROBLEMA: Múltiples definiciones de `Customer`
1. `/src/lib/database/queries/customers.ts` - Tipo `Customer`
2. `/src/integrations/whatsapp/types/index.ts` - `BotCustomer` (similar pero diferente)

**Recomendación:** Los adapters deben convertir entre tipos, no duplicar.

---

## 🔄 6. FLUJO DEL WEBHOOK DE WHATSAPP (PASO A PASO)

### 6.1 Recepción del Mensaje

```
1. WAHA envía evento POST a /api/webhooks/whatsapp
   ↓
2. route.ts recibe el evento
   ↓
3. Identifica tipo de evento: 'message', 'session.status', 'message.reaction'
   ↓
4. Si es 'message', llama a handleMessageEvent()
```

### 6.2 Procesamiento del Mensaje

```
handleMessageEvent():
  ↓
5. Extrae datos del mensaje (body.payload o body.message)
   ↓
6. Obtiene sessionName del evento
   ↓
7. Verifica que NO sea mensaje propio (fromMe !== true)
   ↓
8. Verifica que NO sea de grupo (@g.us)
   ↓
9. Verifica que NO sea estado de WhatsApp (status@broadcast)
   ↓
10. Extrae número del remitente (extractPhoneNumber())
    ↓
11. Obtiene organizationId (getOrganizationFromSession(sessionName))
    ↓
12. Verifica que el remitente NO sea el mismo número que la sesión (evita loops)
    ↓
13. Obtiene cliente Supabase (getSupabaseServiceClient())
    ↓
14. Busca/crea conversación (getOrCreateConversation())
    - Busca en whatsapp_conversations
    - Si no existe, busca/crea cliente en customers
    - Crea nueva conversación
    ↓
15. Detecta tipo de mensaje (text, image, audio, video, document)
    ↓
16. Extrae media URL si hay multimedia
    ↓
17. Construye texto del mensaje (incluye indicadores de media si no hay texto)
    ↓
18. GUARDA MENSAJE EN BD (whatsapp_messages)
    - Si es duplicado (constraint UNIQUE), retorna sin procesar
    ↓
19. Actualiza conversación (incrementa messages_count, actualiza last_message)
```

### 6.3 Procesamiento con AI

```
20. Verifica si bot está activo (is_bot_active en whatsapp_conversations)
    ↓
21. Si bot activo, carga configuración AI (ai_agent_config)
    ↓
22. Verifica que AI esté habilitado (enabled = true)
    ↓
23. Llama a processMessage() [ai-agent.ts]
    ↓
24. processMessage() carga contexto:
    - loadAIContext() → Carga ai_agent_config, organizations
    - getConversationHistory() → Carga mensajes anteriores
    - buildSystemPrompt() → Construye prompt con toda la info
    ↓
25. Si auto_schedule_appointments está activo, agrega funciones:
    - create_appointment_request
    - check_availability
    - get_services_info
    ↓
26. Llama a OpenAI/Anthropic con:
    - system_prompt
    - conversation_history
    - customer_message
    - functions (si están habilitadas)
    ↓
27. Si AI retorna function_call:
    - Parsea argumentos
    - Ejecuta función (executeFunction() [function-executor.ts])
    - Agrega resultado a messages como role "function"
    - Hace segunda llamada a OpenAI con resultado
    ↓
28. Retorna respuesta final del AI
```

### 6.4 Envío de Respuesta

```
29. Si AI generó respuesta:
    ↓
30. Envía mensaje (sendWhatsAppMessage() [waha-sessions.ts])
    - Verifica estado de sesión
    - Si sesión está en FAILED/STOPPED, intenta reiniciar
    - Formatea número al formato WhatsApp
    - Llama a WAHA API: /api/sendText
    ↓
31. Guarda mensaje saliente en BD (whatsapp_messages)
    ↓
32. Actualiza conversación (incrementa messages_count, actualiza last_message)
```

### 6.5 Guardado en Base de Datos

**Tablas involucradas:**
1. **`whatsapp_conversations`**
   - Se crea/actualiza en: `getOrCreateConversation()`
   - Campos actualizados: `messages_count`, `last_message`, `last_message_at`

2. **`whatsapp_messages`**
   - Se inserta en: `saveIncomingMessage()`, `saveOutgoingMessage()`
   - Constraint UNIQUE: `provider_message_id` (previene duplicados)

3. **`customers`**
   - Se crea en: `getOrCreateConversation()` si no existe

4. **`appointment_requests`**
   - Se crea en: `createAppointmentRequest()` [function-executor.ts]
   - Solo si `auto_schedule_appointments` está activo

5. **`appointments`**
   - Se consulta en: `checkAvailability()` [function-executor.ts]
   - Para verificar conflictos

6. **`ai_agent_config`**
   - Se consulta en: `loadAIContext()`, `getAIConfig()`
   - Se actualiza en: `handleSessionStatusEvent()` (campo `whatsapp_connected`)

---

## ⚠️ 7. POSIBLES CONFLICTOS

### 7.1 Imports Circulares

#### ⚠️ POTENCIAL: SessionContext ↔ AuthContext
- `SessionContext` no importa `AuthContext` (✅ OK)
- `AuthContext` puede importar `SessionContext` (verificar si hay)

**Estado actual:** Parece que no hay circularidad, pero verificar.

#### ⚠️ POTENCIAL: WhatsApp Services
- `ai-agent.ts` → `context-loader.ts` → `supabase-server-helpers` → `@/lib/supabase/server`
- `function-executor.ts` → `context-loader.ts` → `supabase-server-helpers`
- `function-executor.ts` → `adapters/*` → `@/lib/database/queries/*`

**Estado actual:** No parece haber circularidad, pero la cadena es larga.

### 7.2 Funciones con el Mismo Nombre en Diferentes Archivos

#### ⚠️ PROBLEMA: `getWahaConfig` vs `getWAHAConfig`
- `waha-sessions.ts`: `getWahaConfig()` (minúscula)
- `waha-service.ts`: `getWAHAConfig()` (mayúscula)

**Recomendación:** Usar siempre `getWahaConfig()` de `waha-sessions.ts` (es el principal).

#### ⚠️ PROBLEMA: `getSupabaseClient` en múltiples lugares
- `/lib/supabase/client.ts` - `createClient()` (función principal)
- `/integrations/whatsapp/utils/supabase-helpers.ts` - `getSupabaseClient()` (wrapper)

**Recomendación:** Usar siempre `createClient()` de `/lib/supabase/client.ts` directamente.

### 7.3 Variables Globales o Estados Compartidos

#### ⚠️ PROBLEMA: Cliente OpenAI/Anthropic como variable global
- `ai-agent.ts` tiene `openaiClient` y `anthropicClient` como variables de módulo
- Se inicializan lazy (solo cuando se necesitan)

**Riesgo:** Si se modifica la inicialización, puede afectar todas las llamadas.

**Recomendación:** No modificar la lógica de inicialización sin entender el impacto.

#### ⚠️ PROBLEMA: Cache de órdenes en memoria
- `/lib/database/queries/work-orders.ts` tiene `ordersCache` como Map global
- TTL: 5 segundos

**Riesgo:** Si se modifica el TTL o la lógica de cache, puede causar inconsistencias.

**Recomendación:** No modificar sin actualizar todos los lugares que dependen del cache.

### 7.4 Estados Compartidos que Pueden Causar Problemas

#### ⚠️ PROBLEMA: `organizationId` como estado compartido
- Múltiples componentes y hooks dependen de `organizationId`
- Si `SessionContext` no carga correctamente, TODO falla

**Riesgo:** Cambios en `SessionContext` pueden romper toda la aplicación.

**Recomendación:** 
- No modificar `SessionContext` sin pruebas exhaustivas
- Siempre verificar que `organizationId` esté disponible antes de usarlo

#### ⚠️ PROBLEMA: Estado de sesión de WhatsApp
- El estado se guarda en `ai_agent_config.whatsapp_connected`
- Se actualiza desde el webhook (`handleSessionStatusEvent`)
- Se lee desde múltiples componentes

**Riesgo:** Si el webhook no actualiza correctamente, la UI mostrará estado incorrecto.

**Recomendación:** No modificar `handleSessionStatusEvent` sin entender el flujo completo.

---

## 🎯 8. REGLAS DE ORO PARA MODIFICAR CÓDIGO

### 8.1 Antes de Modificar un Archivo

1. **Verificar dependencias:**
   - ¿Qué archivos importan este archivo?
   - ¿Qué funciones exporta que son usadas por otros?
   - Usar `grep` para buscar imports

2. **Verificar tipos:**
   - ¿Hay tipos definidos que otros archivos esperan?
   - ¿Cambiar un tipo romperá otros archivos?

3. **Verificar funciones críticas:**
   - ¿Esta función es usada en múltiples lugares?
   - ¿Cambiar la firma romperá otros archivos?

### 8.2 Archivos que NUNCA Deben Modificarse sin Revisión Completa

1. **`/src/lib/waha-sessions.ts`**
   - Usado por webhook y múltiples componentes
   - Cambios pueden romper toda la integración de WhatsApp

2. **`/src/app/api/webhooks/whatsapp/route.ts`**
   - Endpoint crítico que recibe todos los mensajes
   - Cambios pueden causar pérdida de mensajes

3. **`/src/integrations/whatsapp/services/ai-agent.ts`**
   - Lógica compleja de AI y function calling
   - Cambios pueden romper el comportamiento del bot

4. **`/src/lib/context/SessionContext.tsx`**
   - Contexto principal usado por toda la app
   - Cambios pueden romper autenticación y multi-tenant

5. **`/src/lib/auth/organization-server.ts`**
   - Función crítica para multi-tenant
   - Si falla, TODO el sistema falla

### 8.3 Patrones a Seguir

1. **Siempre usar `organizationId` del contexto/hook:**
   ```typescript
   // ✅ CORRECTO
   const { organizationId } = useSession()
   
   // ❌ INCORRECTO (hardcodeado)
   const organizationId = '042ab6bd-8979-4166-882a-c244b5e51e51'
   ```

2. **Siempre validar `organizationId` antes de usar:**
   ```typescript
   // ✅ CORRECTO
   if (!organizationId) {
     console.warn('⚠️ Esperando organizationId...')
     return
   }
   ```

3. **Usar service client solo cuando sea necesario:**
   ```typescript
   // ✅ CORRECTO (en API routes que necesitan bypass RLS)
   const supabase = getSupabaseServiceClient()
   
   // ✅ CORRECTO (en server components)
   const supabase = await getSupabaseServerClient()
   
   // ✅ CORRECTO (en client components)
   const supabase = createClient()
   ```

4. **No duplicar funciones:**
   - Si existe una función en `/lib`, no crear una nueva
   - Si necesitas variación, crear wrapper, no duplicar

5. **Mantener compatibilidad con tipos:**
   - Si cambias un tipo usado por múltiples archivos, actualizar TODOS
   - O crear nuevo tipo y migrar gradualmente

---

## 📚 9. REFERENCIAS RÁPIDAS

### 9.1 ¿Dónde está X?

- **Obtener organizationId en servidor:** `@/lib/auth/organization-server`
- **Obtener organizationId en cliente:** `useOrganizationId()` hook
- **Cliente Supabase (servidor):** `@/lib/supabase/server`
- **Cliente Supabase (cliente):** `@/lib/supabase/client`
- **Sesión de WhatsApp:** `@/lib/waha-sessions`
- **Contexto de sesión:** `@/lib/context/SessionContext`
- **Tipos de WhatsApp:** `@/integrations/whatsapp/types`

### 9.2 ¿Cómo hacer X?

- **Crear nueva API route:** Crear en `/src/app/api/[ruta]/route.ts`
- **Agregar nueva función al AI:** 
  1. Agregar a `AIFunctionName` en `types/index.ts`
  2. Agregar case en `function-executor.ts`
  3. Agregar definición en `ai-agent.ts` (solo si `auto_schedule_appointments`)
- **Agregar nuevo hook:** Crear en `/src/hooks/`
- **Agregar nuevo contexto:** Crear en `/src/contexts/` o `/src/lib/context/`

### 9.3 Troubleshooting Común

- **"No hay token en el contexto":** Verificar que `SessionContext` esté montado y cargado
- **"organizationId es null":** Verificar que `SessionContext` haya cargado completamente
- **"Mensajes duplicados":** Verificar constraint UNIQUE en `whatsapp_messages.provider_message_id`
- **"Bot no responde":** Verificar `is_bot_active` en conversación y `enabled` en `ai_agent_config`
- **"Sesión de WhatsApp no funciona":** Verificar `WAHA_API_URL` y `WAHA_API_KEY` en env o BD

---

## 🔄 10. FLUJOS DE DATOS CRÍTICOS

### 10.1 Flujo de Autenticación

```
Usuario inicia sesión
  ↓
SessionContext.loadSession()
  ↓
supabase.auth.getUser()
  ↓
Consulta users table (auth_user_id)
  ↓
Obtiene organization_id y workshop_id
  ↓
Consulta workshops table (si hay workshop_id)
  ↓
Actualiza estado de SessionContext
  ↓
Componentes reciben organizationId via useSession()
```

### 10.2 Flujo de Creación de Orden desde WhatsApp

```
Cliente envía mensaje: "Quiero servicio X"
  ↓
AI Agent procesa mensaje
  ↓
AI decide llamar función: create_appointment_request
  ↓
function-executor.executeFunction('create_appointment_request')
  ↓
createAppointmentRequest()
  - checkAvailability() primero
  - Valida business_hours
  - Verifica conflictos
  - Crea en appointment_requests
  ↓
AI recibe resultado de función
  ↓
AI genera respuesta: "Tu cita está agendada para..."
  ↓
sendWhatsAppMessage() envía respuesta
```

### 10.3 Flujo de Sincronización de Estado

```
Componente monta
  ↓
useSession() obtiene organizationId
  ↓
Hook de datos (useCustomers, useWorkOrders, etc.) se ejecuta
  ↓
Hook carga datos desde API o BD
  ↓
Componente recibe datos y renderiza
  ↓
Si organizationId cambia, hooks se re-ejecutan
```

---

## 📋 11. CHECKLIST ANTES DE MODIFICAR

Antes de modificar cualquier archivo, verificar:

- [ ] ¿Qué archivos importan este archivo? (`grep -r "import.*archivo" src/`)
- [ ] ¿Qué funciones exporta que son usadas por otros? (`grep -r "nombreFuncion" src/`)
- [ ] ¿Hay tipos que otros archivos esperan? (`grep -r "TipoNombre" src/`)
- [ ] ¿Este archivo es crítico para WhatsApp/AI? (ver sección 2)
- [ ] ¿Este archivo afecta multi-tenant? (verifica uso de `organizationId`)
- [ ] ¿Hay tests para este archivo? (verificar antes de cambiar)
- [ ] ¿Puedo hacer el cambio sin romper compatibilidad? (considerar versionado)

---

## 🎓 12. CONVENCIONES Y ESTÁNDARES

### 12.1 Nombres de Archivos
- **Componentes:** PascalCase (`WorkOrderCard.tsx`)
- **Hooks:** camelCase con prefijo `use` (`useCustomers.ts`)
- **Utilidades:** camelCase (`waha-sessions.ts`)
- **Tipos:** camelCase (`types/index.ts`)

### 12.2 Estructura de Funciones
- **Funciones async:** Siempre usar `async/await`, no `.then()`
- **Manejo de errores:** Siempre usar `try/catch` en funciones async
- **Logs:** Usar prefijos consistentes: `[ComponentName]`, `[FunctionName]`

### 12.3 Imports
- **Orden preferido:**
  1. React/Next.js
  2. Librerías externas
  3. Componentes UI
  4. Hooks
  5. Utilidades locales
  6. Tipos

### 12.4 Comentarios
- **Archivos críticos:** Documentar propósito y flujo principal
- **Funciones complejas:** Documentar parámetros y retorno
- **Lógica no obvia:** Explicar el "por qué", no el "qué"

---

**FIN DEL DOCUMENTO**

Este documento debe actualizarse cuando se agreguen nuevos archivos críticos o se modifiquen dependencias importantes.
