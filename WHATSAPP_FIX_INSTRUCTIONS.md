# Script para aplicar los fixes de WhatsApp

## PASO 1: Backup de los archivos actuales (OPCIONAL pero recomendado)
```bash
cp src/app/api/whatsapp/session/route.ts src/app/api/whatsapp/session/route.ts.backup
cp src/components/WhatsAppQRConnector.tsx src/components/WhatsAppQRConnector.tsx.backup
```

## PASO 2: Reemplazar con las versiones nuevas y simplificadas

### 2.1 Reemplazar el endpoint API
```bash
# Windows (PowerShell)
Move-Item -Path src/app/api/whatsapp/session/route-new.ts -Destination src/app/api/whatsapp/session/route.ts -Force

# Linux/Mac
mv -f src/app/api/whatsapp/session/route-new.ts src/app/api/whatsapp/session/route.ts
```

### 2.2 Actualizar la página que usa el componente
Edita `src/app/(protected)/integraciones/whatsapp/page.tsx` y cambia:

```typescript
// ANTES:
import { WhatsAppQRConnector } from '@/components/WhatsAppQRConnector'

// DESPUÉS:
import { WhatsAppQRConnectorSimple as WhatsAppQRConnector } from '@/components/WhatsAppQRConnectorSimple'
```

## PASO 3: Probar
1. Asegúrate de que NO hay sesiones activas en WAHA
2. Recarga la aplicación
3. Ve a Integraciones → WhatsApp
4. Haz clic en "Vincular WhatsApp"
5. Deberías ver el QR en ~5-10 segundos

## PASO 4: Probar multi-tenant
1. Conecta WhatsApp en la organización actual
2. Crea o cambia a otra organización
3. Ve a Integraciones → WhatsApp
4. Deberías ver "No conectado" (sesión independiente)
5. Conecta con otro número
6. Ambas sesiones deberían funcionar independientemente

## CAMBIOS REALIZADOS

### 1. Endpoint API simplificado (`/api/whatsapp/session/route.ts`)
- ✅ Eliminada lógica compleja y redundante
- ✅ Flujo claro: verificar estado → crear si no existe → obtener QR
- ✅ Logout mejorado: logout → verificar → si falla, stop/start → obtener QR
- ✅ Manejo robusto de estados WAHA
- ✅ Logs claros y numerados

### 2. Componente frontend simplificado (`WhatsAppQRConnectorSimple.tsx`)
- ✅ Eliminado polling excesivo (8 segundos en lugar de 3-5)
- ✅ Máximo de reintentos (5 minutos)
- ✅ Un solo `useEffect` en el montaje
- ✅ Sin refs complejos
- ✅ Sin lógica de "waitingForQR" complicada
- ✅ Polling se detiene automáticamente cuando se conecta
- ✅ Logs claros y mínimos

### 3. Multi-tenant
- ✅ `generateSessionName()` usa organizationId único
- ✅ `getOrganizationSession()` busca/crea sesión por org
- ✅ Cada organización tiene su sesión: `confiadrive_<orgId>`

## TROUBLESHOOTING

### Si el QR no aparece:
1. Revisa los logs del servidor (Vercel Functions o terminal)
2. Busca `[WhatsApp Session GET]` y `[WAHA Sessions]`
3. Verifica que las variables de entorno están configuradas
4. Usa el endpoint de diagnóstico: `/api/whatsapp/test-waha`

### Si el logout no funciona:
1. Los logs mostrarán el flujo completo numerado
2. Si ves "Estado después de logout: WORKING", se activará el fallback
3. El fallback hace stop + start forzado

### Si hay problemas de multi-tenant:
1. Verifica que `organization_id` está llegando correctamente
2. Revisa los logs: `🏢 Organization ID:`
3. Comprueba que cada org tiene su sessionName único

