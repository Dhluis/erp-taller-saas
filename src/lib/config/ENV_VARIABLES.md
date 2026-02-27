# 📋 **VARIABLES DE ENTORNO REQUERIDAS**

## 🚨 **VARIABLES CRÍTICAS (OBLIGATORIAS)**

### **1. SUPABASE**
```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_de_supabase
```

### **2. AUTENTICACIÓN**
```bash
JWT_SECRET=tu_secreto_jwt_aqui
ENCRYPTION_KEY=tu_clave_de_encriptacion_aqui
```

### **3. BASE DE DATOS**
```bash
DATABASE_URL=postgresql://usuario:password@host:puerto/database
```

## 🔧 **VARIABLES DE CONFIGURACIÓN**

### **4. APLICACIÓN**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### **5. LOGGING**
```bash
LOG_LEVEL=info
DEBUG_QUERIES=false
ENABLE_DETAILED_LOGGING=true
```

### **6. SEGURIDAD**
```bash
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_REQUESTS_PER_HOUR=1000
```

### **7. CACHE**
```bash
CACHE_TTL=300
CACHE_MAX_SIZE=100
```

### **8. UPLOADS**
```bash
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

## 🏢 **VARIABLES ESPECÍFICAS DEL ERP**

### **9. ORGANIZACIÓN**
```bash
DEFAULT_ORGANIZATION_ID=00000000-0000-0000-0000-000000000001
```

### **10. MONEDA Y IMPUESTOS**
```bash
DEFAULT_CURRENCY=MXN
DEFAULT_TAX_RATE=16.0
```

### **11. PAGINACIÓN**
```bash
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

### **12. INVENTARIO**
```bash
LOW_STOCK_THRESHOLD=5
ENABLE_STOCK_ALERTS=true
```

### **13. FACTURACIÓN**
```bash
INVOICE_NUMBER_PREFIX=FAC
QUOTATION_NUMBER_PREFIX=COT
PAYMENT_NUMBER_PREFIX=PAG
```

### **14. STRIPE (BILLING)**
```bash
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### **14b. MERCADOPAGO (BILLING - MX, AR, BR, CL, CO, PE, UY)**
```bash
# Access Token de producción o pruebas (desarrollo)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
```
Obligatoria si se usa MercadoPago para suscripciones en los países configurados en `shouldUseMercadoPago()`. El webhook debe ser configurado en el panel de MercadoPago apuntando a `{NEXT_PUBLIC_APP_URL}/api/billing/mercadopago/webhook` (topic: payment).

### **14c. CRON – Expiración de suscripciones (downgrade automático)**
```bash
# Secreto para autorizar llamadas al cron de expiración (Vercel lo envía como Bearer en Authorization)
CRON_SECRET=un_valor_aleatorio_largo_min_16_caracteres
```
Obligatoria en producción si usas el cron de Vercel (`vercel.json` → `crons`). El job llama a `/api/cron/expire-subscriptions` diariamente (06:00 UTC) y baja a Free las organizaciones Premium cuyo `current_period_end` ya pasó (MercadoPago y edge cases de Stripe). Si usas un cron externo, puedes llamar `GET /api/cron/expire-subscriptions?secret=<CRON_SECRET>`.

### **15. EMAIL (un solo proveedor recomendado: SendGrid)**

**Recomendación:** usar **solo SendGrid** para todo (cotizaciones, invitaciones, mensajería, notificaciones). Una sola API key y mejor entregabilidad.

**Opción A – SendGrid (recomendada, un solo proveedor):**
```bash
SENDGRID_API_KEY=SG.xxx
SMTP_FROM_EMAIL=noreply@tudominio.com
SMTP_FROM_NAME=Eagles System
```
Con esto, todos los envíos (cotizaciones por email, invitaciones, panel Mensajería, notificaciones de órdenes) usan SendGrid. No hace falta configurar SMTP_* de Hostinger/otros.

**Opción B – SMTP (Nodemailer):** si prefieres no usar SendGrid:
```bash
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_usuario
SMTP_PASS=tu_contraseña
SMTP_FROM_NAME=Eagles System
SMTP_FROM_EMAIL=noreply@tudominio.com
```

**Prioridad:** si están configurados ambos, el código usa **SendGrid primero** y solo usa SMTP si no hay `SENDGRID_API_KEY`. Para un solo proveedor, configura solo SendGrid (Opción A). Para mensajería/notificaciones por organización, SendGrid usa además la tabla `organization_messaging_config` (email_enabled, email_from_name, etc.) cuando existe; si no, usa las variables de entorno anteriores.

### **16. ÓRDENES DE TRABAJO**
```bash
WORK_ORDER_NUMBER_PREFIX=WO
ESTIMATED_HOURS_DEFAULT=2.0
```

### **15. VALIDACIONES**
```bash
VEHICLE_VIN_VALIDATION=true
VEHICLE_LICENSE_PLATE_VALIDATION=true
CUSTOMER_EMAIL_VALIDATION=true
CUSTOMER_PHONE_VALIDATION=true
```

### **16. USUARIOS Y ROLES**
```bash
USER_PASSWORD_MIN_LENGTH=8
USER_SESSION_TIMEOUT=3600
DEFAULT_USER_ROLE=user
ADMIN_ROLE=admin
MANAGER_ROLE=manager
```

### **17. PERMISOS**
```bash
ENABLE_ROLE_BASED_ACCESS=true
ENABLE_PERMISSION_CHECKS=true
```

### **18. AUDITORÍA**
```bash
ENABLE_AUDIT_LOGS=true
AUDIT_LOG_RETENTION_DAYS=365
```

### **19. SISTEMA**
```bash
SYSTEM_MAINTENANCE_MODE=false
SYSTEM_MAINTENANCE_MESSAGE=El sistema está en mantenimiento
```

### **20. MONITOREO**
```bash
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_THRESHOLD_MS=1000
ENABLE_ERROR_REPORTING=true
ERROR_REPORTING_EMAIL=admin@example.com
```

## 🛠️ **VARIABLES DE DESARROLLO**

### **21. DEBUGGING**
```bash
DEBUG_MODE=true
HOT_RELOAD=true
DEV_PORT=3000
ENABLE_DEBUG_TOOLBAR=true
ENABLE_QUERY_LOGGING=false
ENABLE_SLOW_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD_MS=500
```

### **22. TESTING**
```bash
ENABLE_AUTO_TESTS=true
MIN_TEST_COVERAGE=80
TEST_TIMEOUT=30
```

## 📝 **CÓMO CONFIGURAR**

### **1. Crear archivo .env.local**
```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar las variables
nano .env.local
```

### **2. Configurar Supabase**
1. Ir a tu proyecto en Supabase
2. Settings > API
3. Copiar URL y claves
4. Pegar en .env.local

### **3. Generar claves de seguridad**
```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar ENCRYPTION_KEY
openssl rand -base64 32
```

### **4. Validar configuración**
```bash
# Verificar que todas las variables estén configuradas
npm run validate-env
```

## ⚠️ **NOTAS IMPORTANTES**

1. **NUNCA** commitees el archivo `.env.local`
2. **SIEMPRE** usa `.env.example` como plantilla
3. **VALIDA** todas las variables antes de desplegar
4. **ROTA** las claves de seguridad regularmente
5. **USA** diferentes configuraciones para desarrollo/producción

## 🔍 **VERIFICACIÓN DE CONFIGURACIÓN**

### **Comando de verificación**
```bash
# Verificar variables de entorno
npm run check-env

# Validar configuración de Supabase
npm run validate-supabase

# Probar conexión a base de datos
npm run test-db-connection
```

### **Scripts de validación**
```typescript
// Verificar variables críticas
import { validateEnvironmentVariables } from '@/lib/config/env';

try {
  validateEnvironmentVariables();
  console.log('✅ Todas las variables de entorno están configuradas');
} catch (error) {
  console.error('❌ Variables de entorno faltantes:', error.message);
}
```

## 🚀 **DESPLIEGUE**

### **Variables de producción**
```bash
# Configurar en tu plataforma de despliegue
NEXT_PUBLIC_SUPABASE_URL=tu_url_produccion
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_produccion
SUPABASE_SERVICE_ROLE_KEY=tu_clave_servicio_produccion
NODE_ENV=production
```

### **Variables de desarrollo**
```bash
# Configurar en .env.local
NEXT_PUBLIC_SUPABASE_URL=tu_url_desarrollo
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_desarrollo
SUPABASE_SERVICE_ROLE_KEY=tu_clave_servicio_desarrollo
NODE_ENV=development
```




















