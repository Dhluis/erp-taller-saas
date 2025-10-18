# 🔧 Configuración de Supabase para EAGLES ERP

## 📋 Pasos para Configurar Supabase

### 1. **Crear Proyecto en Supabase**

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Anota la URL y la clave anónima

### 2. **Configurar Variables de Entorno**

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1MjAsImV4cCI6MjA3NDMwODUyMH0.u3EAXSQTT87R2O5vHMyGE0hFLKLcB6LjkgHqkKclx2Q
```

### 3. **Ejecutar Migraciones SQL**

Ejecuta los siguientes archivos SQL en el editor SQL de Supabase:

1. `supabase/migrations/001_initial_setup.sql`
2. `supabase/migrations/002_add_organizations_and_multi_tenancy.sql`
3. `supabase/migrations/003_add_suppliers_and_notifications.sql`
4. `supabase/migrations/004_add_all_new_features.sql`
5. `supabase/migrations/005_add_user_profiles.sql`

### 4. **Verificar Configuración**

1. Reinicia el servidor de desarrollo: `npm run dev`
2. Ve a la página principal
3. Ejecuta el diagnóstico de Supabase
4. Verifica que todas las pruebas pasen

## 🚨 Solución de Problemas Comunes

### Error: "Supabase configuration missing"

**Causa:** Variables de entorno no configuradas

**Solución:**
1. Verifica que el archivo `.env.local` existe
2. Verifica que las variables tienen los nombres correctos
3. Reinicia el servidor de desarrollo

### Error: "Table 'suppliers' does not exist"

**Causa:** Las migraciones no se han ejecutado

**Solución:**
1. Ve al editor SQL en Supabase
2. Ejecuta todas las migraciones en orden
3. Verifica que las tablas se crearon correctamente

### Error: "Row Level Security policy"

**Causa:** Políticas RLS no configuradas

**Solución:**
1. Las migraciones incluyen las políticas RLS
2. Verifica que se ejecutaron correctamente
3. Asegúrate de estar autenticado

## 📊 Estructura de Base de Datos

### Tablas Principales:
- `organizations` - Organizaciones multi-tenant
- `user_profiles` - Perfiles de usuario (vincula auth.users con organizations)
- `clients` - Clientes
- `vehicles` - Vehículos
- `work_orders` - Órdenes de trabajo
- `inventory` - Inventario
- `suppliers` - Proveedores
- `notifications` - Notificaciones
- `appointments` - Citas
- `leads` - Prospectos
- `campaigns` - Campañas
- `invoices` - Facturas
- `system_users` - Usuarios del sistema
- `company_settings` - Configuraciones de empresa

## 🔐 Autenticación

El sistema usa Supabase Auth con JWT tokens que incluyen `organization_id` para multi-tenancy.

### Sistema de Perfiles de Usuario

La tabla `user_profiles` vincula directamente los usuarios de Supabase Auth con las organizaciones:

- **Autenticación**: Supabase Auth maneja el login/registro
- **Perfiles**: `user_profiles` almacena información adicional del usuario
- **Multi-tenancy**: Cada usuario pertenece a una organización
- **Roles**: Sistema de roles (admin, manager, mechanic, receptionist, user)
- **RLS**: Row Level Security asegura que los usuarios solo accedan a datos de su organización

### Funciones de Autenticación

```typescript
import { getAuthenticatedUser, requireAuth, requireAdmin } from '@/lib/auth/auth-helpers'

// Obtener usuario autenticado con perfil
const authData = await getAuthenticatedUser()

// Requerir autenticación
const authData = await requireAuth()

// Requerir rol de administrador
const authData = await requireAdmin()
```

## 📱 Características

- ✅ Multi-tenancy completo
- ✅ Row Level Security (RLS)
- ✅ Tiempo real con suscripciones
- ✅ Triggers automáticos
- ✅ Índices optimizados
- ✅ Datos de ejemplo incluidos

## 🆘 Soporte

Si tienes problemas:

1. Ejecuta el diagnóstico en la página principal
2. Revisa los logs de la consola
3. Verifica la configuración de Supabase
4. Asegúrate de que las migraciones se ejecutaron

## 🔄 Comandos Útiles

```bash
# Reiniciar servidor
npm run dev

# Ver logs de Supabase
# Ve a tu proyecto en supabase.com > Logs

# Resetear base de datos (cuidado!)
# En Supabase > Settings > Database > Reset database
```

