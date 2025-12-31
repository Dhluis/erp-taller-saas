# Estado de Integración WhatsApp

## 📱 Resumen

La integración con WhatsApp está implementada y funcional usando WAHA (WhatsApp HTTP API). El sistema permite conectar múltiples números de WhatsApp, uno por organización.

---

## ✅ Funcionalidades Implementadas

1. **Conexión de WhatsApp**
   - Generación de QR code para vincular WhatsApp
   - Visualización del QR en la interfaz
   - Detección automática de conexión
   - Manejo de estados de conexión

2. **Gestión de Sesiones**
   - Creación de sesiones por organización
   - Nombres de sesión únicos (formato: `eagles_<orgId>`)
   - Persistencia en base de datos
   - Gestión de estados (WORKING, SCAN_QR, STOPPED, FAILED, etc.)

3. **Endpoints API**
   - `GET /api/whatsapp/session` - Obtener estado de sesión
   - `POST /api/whatsapp/session` - Acciones (reconnect, logout, change_number)

---

## 🔧 Configuración

### Variables de Entorno
```env
WAHA_API_URL=https://waha-erp-eagles-sistem.0rfifc.easypanel.host
WAHA_API_KEY=mi_clave_segura_2025
```

### Base de Datos
La tabla `ai_agent_config` debe tener:
- `whatsapp_session_name` (VARCHAR) - Nombre de la sesión
- `whatsapp_connected` (BOOLEAN) - Estado de conexión
- `policies.waha_api_url` (JSONB) - URL de WAHA
- `policies.waha_api_key` (JSONB) - API Key de WAHA

---

## ⚠️ Comportamiento Actual

### Estados de Sesión

| Estado | Descripción | Acción del Sistema |
|--------|-------------|-------------------|
| `WORKING` | Conectado y funcionando | ✅ Muestra número conectado |
| `SCAN_QR` | Esperando escanear QR | ✅ Muestra QR code |
| `STOPPED` | Detenido (puede ser transitorio) | ⚠️ No reinicia automáticamente (espera recuperación) |
| `FAILED` | Error en la sesión | ⚠️ Muestra botón para reiniciar manualmente |
| `ERROR` | Error crítico | ⚠️ Muestra botón para reiniciar manualmente |
| `STARTING` | Iniciando | ⏳ Espera a que termine |

### Flujo de Conexión

1. Usuario hace clic en "Vincular WhatsApp"
2. Sistema crea/inicia sesión en WAHA
3. Sistema obtiene QR code
4. Usuario escanea QR con WhatsApp
5. Sistema detecta conexión (polling)
6. Muestra número conectado

### Reinicio Manual

Si la sesión queda en estado `FAILED` o `ERROR`:
- El sistema NO reinicia automáticamente
- El usuario debe hacer clic en "Vincular WhatsApp" o "Cambiar número"
- El sistema entonces elimina la sesión fallida y crea una nueva

---

## 🔍 Detalles Técnicos

### Prevención de Reinicios Automáticos

El código implementa lógica para evitar reinicios automáticos en estados transitorios:

```typescript
// En GET /api/whatsapp/session
// Si la sesión existe pero está STOPPED/FAILED/ERROR
// NO reiniciar automáticamente - puede ser transitorio
if (['FAILED', 'STOPPED', 'ERROR'].includes(status.status)) {
  if (!status.exists) {
    // Solo crear si no existe
    await createOrganizationSession(organizationId);
  } else {
    // Si existe, solo retornar estado (no reiniciar)
    return NextResponse.json({ status: status.status, ... });
  }
}
```

**Razón:** WAHA puede reportar estados transitorios que se resuelven automáticamente. Reiniciar automáticamente causaría loops infinitos.

### Polling del Frontend

El componente `WhatsAppQRConnectorSimple.tsx` hace polling:
- Cada 8 segundos cuando espera QR
- Cada 30 segundos cuando está conectado
- Detiene polling si detecta estado de error que requiere acción manual

---

## 📊 Base de Datos - Estado Actual

Según última verificación:
- ✅ 2 organizaciones con configuración WAHA correcta
- ⚠️ 2 organizaciones con `whatsapp_session_name = "default"` (se corrige automáticamente)
- ⚠️ 3 organizaciones sin configuración WAHA en policies (usa config de otros registros)

### Query para Verificar
```sql
SELECT 
  organization_id,
  whatsapp_session_name,
  whatsapp_connected,
  CASE 
    WHEN policies->>'waha_api_url' IS NOT NULL 
         AND policies->>'waha_api_key' IS NOT NULL 
    THEN '✅ OK' 
    ELSE '❌ Falta config' 
  END as config_status
FROM ai_agent_config;
```

---

## 🐛 Problemas Conocidos

### 1. Estados Intermitentes
**Síntoma:** Sesión cambia entre WORKING y STOPPED ocasionalmente  
**Causa:** Estados transitorios de WAHA  
**Solución:** El sistema espera recuperación automática. Si persiste, reinicio manual.

### 2. QR No Aparece
**Síntoma:** Al hacer clic en "Vincular WhatsApp", no aparece QR  
**Causa:** Sesión en estado FAILED que requiere eliminación  
**Solución:** El código ahora detecta FAILED y elimina/recrea la sesión automáticamente.

### 3. Sesión en FAILED
**Síntoma:** Estado FAILED que no se recupera  
**Causa:** Error en WAHA o desconexión  
**Solución:** Usar botón "Cambiar número" para reiniciar completamente.

---

## 🚀 Mejoras Futuras (Opcionales)

1. **Retry Logic Mejorado:** Implementar backoff exponencial para reintentos
2. **Health Checks:** Monitoreo automático de salud de sesiones
3. **Notificaciones:** Alertas cuando una sesión falla
4. **Logs Estructurados:** Mejor logging para debugging
5. **Métricas:** Tracking de tasa de éxito de conexiones

---

## 📝 Notas para Desarrollo

### Archivos Clave
- `src/lib/waha-sessions.ts` - Lógica de gestión de sesiones
- `src/app/api/whatsapp/session/route.ts` - Endpoints API
- `src/components/WhatsAppQRConnectorSimple.tsx` - Componente frontend

### Testing Manual
1. Conectar WhatsApp → Verificar QR aparece
2. Escanear QR → Verificar conexión
3. Desconectar → Verificar estado cambia
4. Reconectar → Verificar nueva sesión se crea

---

**Última actualización:** Enero 2025  
**Versión Estable Anterior:** Commit `773cb2a` (confeti)  
**Versión Estable Actual:** Commit `c6cd22c` (fix(whatsapp): mostrar 'Activo' cuando hay configuración aunque enabled sea false)

