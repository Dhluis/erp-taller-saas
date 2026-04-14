# 📚 Sistema de Documentación Swagger/OpenAPI

## 🎯 Descripción

Sistema completo de documentación automática para la API del Confia Drive, generando especificaciones OpenAPI 3.0.0 desde comentarios JSDoc en el código.

## 🚀 Características

- ✅ **Generación automática** desde comentarios JSDoc
- ✅ **Tipos TypeScript** para desarrollo seguro
- ✅ **Validación automática** de la especificación
- ✅ **Manejo de errores** robusto
- ✅ **Configuración flexible** para diferentes entornos
- ✅ **Interfaz interactiva** con Swagger UI

## 📁 Estructura de Archivos

```
src/lib/swagger/
├── generator.ts          # Generador principal (NUEVO)
├── jsdoc-config.ts       # Configuración original
├── enhanced-config.ts    # Configuración mejorada
└── README.md            # Esta documentación
```

## 🔧 Uso del Generador

### 1. Generador Simple (Recomendado)

```typescript
// src/lib/swagger/generator.ts
import { generateSwaggerSpec } from '@/lib/swagger/generator'

// Generar especificación
const spec = generateSwaggerSpec()
```

### 2. Configuración en Endpoints

```typescript
// src/app/api/swagger.json/route.ts
import { generateSwaggerSpec } from '@/lib/swagger/generator'

export async function GET() {
  try {
    const spec = generateSwaggerSpec()
    return NextResponse.json(spec)
  } catch (error) {
    return NextResponse.json({ error: 'Error generating API documentation' }, { status: 500 })
  }
}
```

## 📝 Documentación de Endpoints

### Ejemplo de Comentarios JSDoc

```typescript
/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Lista todos los clientes
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 error:
 *                   type: null
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no autenticado
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error interno del servidor
 *   post:
 *     summary: Crear nuevo cliente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del cliente
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del cliente
 *                 example: juan@example.com
 *               phone:
 *                 type: string
 *                 description: Teléfono del cliente
 *                 example: +52 55 1234 5678
 *               address:
 *                 type: string
 *                 description: Dirección del cliente
 *                 example: Calle 123, Colonia Centro
 *               city:
 *                 type: string
 *                 description: Ciudad
 *                 example: Ciudad de México
 *               state:
 *                 type: string
 *                 description: Estado
 *                 example: CDMX
 *               zip_code:
 *                 type: string
 *                 description: Código postal
 *                 example: 01000
 *               country:
 *                 type: string
 *                 description: País
 *                 example: México
 *               tax_id:
 *                 type: string
 *                 description: RFC o ID fiscal
 *                 example: PERJ800101ABC
 *               notes:
 *                 type: string
 *                 description: Notas adicionales
 *                 example: Cliente preferencial
 *             required:
 *               - name
 *               - email
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *                 error:
 *                   type: null
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Datos de cliente inválidos
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no autenticado
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error interno del servidor
 */
```

## 🏗️ Esquemas Disponibles

### Esquemas Comunes
- **Error**: Respuesta de error estándar
- **Success**: Respuesta de éxito estándar
- **Pagination**: Información de paginación

### Esquemas de Entidades
- **Customer**: Cliente
- **Vehicle**: Vehículo
- **Quotation**: Cotización
- **WorkOrder**: Orden de trabajo
- **Invoice**: Factura
- **Product**: Producto
- **Supplier**: Proveedor
- **PurchaseOrder**: Orden de compra
- **User**: Usuario
- **Notification**: Notificación
- **Backup**: Respaldo

## 🔐 Autenticación

El sistema utiliza autenticación JWT con Supabase Auth:

```yaml
securitySchemes:
  bearerAuth:
    type: http
    scheme: bearer
    bearerFormat: JWT
    description: Token JWT de Supabase Auth
```

## 📊 Tags Disponibles

- **Authentication**: Endpoints de autenticación y autorización
- **Customers**: Gestión de clientes
- **Vehicles**: Gestión de vehículos
- **Quotations**: Gestión de cotizaciones
- **Work Orders**: Gestión de órdenes de trabajo
- **Invoices**: Gestión de facturas
- **Products**: Gestión de productos e inventario
- **Suppliers**: Gestión de proveedores
- **Purchase Orders**: Gestión de órdenes de compra
- **Users**: Gestión de usuarios del sistema
- **Reports**: Reportes y métricas
- **Notifications**: Sistema de notificaciones
- **Backups**: Sistema de backup automático

## 🌐 Endpoints de Documentación

### 1. Especificación OpenAPI
```
GET /api/swagger.json
```
Retorna la especificación OpenAPI 3.0.0 en formato JSON.

### 2. Interfaz Swagger UI
```
GET /api-docs
```
Interfaz interactiva para explorar y probar la API.

### 3. Información del Sistema
```
GET /api/docs/info
```
Información detallada sobre el sistema de documentación.

## 🛠️ Configuración Avanzada

### Rutas de Archivos
El generador busca comentarios JSDoc en:
- `src/app/api/customers/route.ts`
- `src/app/api/vehicles/route.ts`
- `src/app/api/quotations/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/invoices/route.ts`
- `src/app/api/products/route.ts`
- `src/app/api/suppliers/route.ts`
- `src/app/api/purchase-orders/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/reports/**/*.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/backups/route.ts`
- `src/app/api/auth/**/*.ts`

### Manejo de Errores
El generador incluye manejo robusto de errores:
- Validación de la especificación generada
- Fallback a especificación básica en caso de error
- Logging detallado de problemas

## 🚀 Ventajas del Sistema

### ✅ Desarrollo
- **Documentación automática**: Siempre actualizada
- **Tipos TypeScript**: Desarrollo seguro
- **Validación automática**: Detección temprana de errores
- **Manejo de errores**: Recuperación automática

### ✅ Mantenimiento
- **Sincronización**: Código y documentación siempre sincronizados
- **Versionado**: Control de versiones de la documentación
- **Escalabilidad**: Fácil adición de nuevos endpoints

### ✅ Usuario Final
- **Interfaz intuitiva**: Swagger UI fácil de usar
- **Pruebas interactivas**: Probar endpoints directamente
- **Documentación completa**: Esquemas y ejemplos detallados

## 📝 Mejores Prácticas

### 1. Comentarios JSDoc
- Usar `@swagger` para documentar endpoints
- Incluir ejemplos realistas
- Documentar todos los parámetros y respuestas
- Usar referencias a esquemas (`$ref`)

### 2. Esquemas
- Definir esquemas reutilizables
- Incluir validaciones y restricciones
- Usar tipos apropiados (string, integer, boolean, etc.)
- Especificar formatos (uuid, email, date, etc.)

### 3. Respuestas
- Documentar todos los códigos de estado
- Incluir ejemplos de respuestas
- Usar esquemas consistentes
- Manejar errores de manera uniforme

## 🔧 Solución de Problemas

### Error: "Module parse failed"
Si encuentras errores de compilación con `swagger-jsdoc`, usa el generador simple:

```typescript
import { generateSwaggerSpec } from '@/lib/swagger/generator'
```

### Error: "Especificación vacía"
Verifica que los archivos de API tengan comentarios JSDoc válidos.

### Error: "Rutas no encontradas"
Asegúrate de que las rutas en la configuración apunten a archivos existentes.

## 📈 Próximos Pasos

1. **Documentar más endpoints**: Agregar comentarios JSDoc a todos los endpoints
2. **Mejorar esquemas**: Añadir más validaciones y restricciones
3. **Autenticación**: Implementar pruebas de autenticación en Swagger UI
4. **Versionado**: Agregar versionado de la API
5. **Métricas**: Implementar métricas de uso de la documentación

## 🎯 Conclusión

El sistema de documentación Swagger está completamente implementado y funcionando, proporcionando:

- ✅ **Documentación automática** desde comentarios JSDoc
- ✅ **Interfaz interactiva** con Swagger UI
- ✅ **Validación automática** de la especificación
- ✅ **Manejo robusto de errores**
- ✅ **Configuración flexible** para diferentes entornos

**El ERP ahora tiene documentación automática, siempre actualizada y fácil de mantener.** 🚀


