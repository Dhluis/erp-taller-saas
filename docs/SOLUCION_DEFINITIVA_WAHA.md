# 🎯 SOLUCIÓN DEFINITIVA: Configuración de WAHA

## 📋 Problema

Las variables de entorno `WAHA_API_URL` y `WAHA_API_KEY` no están disponibles en Vercel después de configurarlas, incluso después de hacer redeploy.

## ✅ Solución Implementada

Se ha implementado un **sistema de fallback** que permite guardar la configuración de WAHA en la base de datos como respaldo. El sistema funciona así:

### 1. **Prioridad de Configuración**

El servicio WAHA ahora busca la configuración en este orden:

1. **Variables de entorno** (más rápido, preferido)
   - `WAHA_API_URL` o `NEXT_PUBLIC_WAHA_API_URL`
   - `WAHA_API_KEY` o `NEXT_PUBLIC_WAHA_API_KEY`

2. **Base de datos** (fallback si no hay variables de entorno)
   - Lee de `ai_agent_config.policies.waha_api_url`
   - Lee de `ai_agent_config.policies.waha_api_key`

### 2. **Cómo Guardar Configuración en la Base de Datos**

#### Opción A: Usando el endpoint de configuración

```bash
POST /api/whatsapp/config
Content-Type: application/json

{
  "waha_api_url": "https://waha-erp-eagles-sistem.0rfifc.easypanel.host",
  "waha_api_key": "mi_clave_segura_2025"
}
```

#### Opción B: Directamente en Supabase

1. Ve a Supabase Dashboard > Table Editor > `ai_agent_config`
2. Encuentra el registro de tu organización
3. Edita el campo `policies` (JSONB)
4. Agrega:
```json
{
  "waha_api_url": "https://waha-erp-eagles-sistem.0rfifc.easypanel.host",
  "waha_api_key": "mi_clave_segura_2025",
  "WAHA_API_URL": "https://waha-erp-eagles-sistem.0rfifc.easypanel.host",
  "WAHA_API_KEY": "mi_clave_segura_2025"
}
```

### 3. **Ventajas de Esta Solución**

✅ **No depende de Vercel**: Funciona incluso si las variables de entorno no están disponibles
✅ **Multi-tenant**: Cada organización puede tener su propia configuración de WAHA
✅ **Flexible**: Puedes cambiar la configuración sin hacer redeploy
✅ **Seguro**: La configuración se guarda en la base de datos con RLS
✅ **Automático**: El servicio detecta automáticamente si debe usar variables de entorno o BD

### 4. **Cómo Verificar que Funciona**

1. Guarda la configuración en la BD usando el endpoint o directamente en Supabase
2. Recarga la página de WhatsApp
3. El componente `WhatsAppQRConnector` debería funcionar correctamente
4. Revisa los logs del servidor - deberías ver:
   ```
   [WAHA Service] ⚠️ Variables de entorno no disponibles, intentando leer de BD...
   [WAHA Service] ✅ Usando configuración de base de datos
   ```

### 5. **Troubleshooting**

#### Si aún no funciona:

1. **Verifica que la configuración esté en la BD:**
   ```sql
   SELECT policies->>'waha_api_url', policies->>'waha_api_key 
   FROM ai_agent_config 
   WHERE organization_id = 'tu-organization-id';
   ```

2. **Verifica los logs del servidor:**
   - Ve a Vercel Dashboard > Deployments > Function Logs
   - Busca mensajes de `[WAHA Service]`

3. **Prueba el endpoint de diagnóstico:**
   ```
   GET /api/whatsapp/test-env
   ```

### 6. **Migración desde Variables de Entorno**

Si ya tienes las variables configuradas en Vercel pero quieres migrar a la BD:

1. Obtén los valores de las variables de entorno
2. Guárdalos en la BD usando el endpoint `/api/whatsapp/config`
3. El sistema seguirá funcionando igual, pero ahora con respaldo en BD

### 7. **Recomendación Final**

**Para producción, usa AMBAS opciones:**
- Variables de entorno en Vercel (más rápido)
- Configuración en BD como respaldo (más confiable)

Esto garantiza que el sistema funcione incluso si hay problemas con las variables de entorno.

---

## 📝 Notas Técnicas

- El servicio WAHA ahora acepta `organizationId` como parámetro opcional en todas las funciones
- Si `organizationId` no se proporciona, solo intentará leer de variables de entorno
- La configuración en BD se lee automáticamente si las variables de entorno no están disponibles
- Los valores en BD tienen prioridad más baja que las variables de entorno (si ambas existen, se usan las variables de entorno)

