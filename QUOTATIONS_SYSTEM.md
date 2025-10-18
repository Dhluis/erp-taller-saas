# 📋 Sistema Completo de Cotizaciones

## 🎯 **RESUMEN DEL SISTEMA**

Se ha implementado un sistema profesional de cotizaciones que permite generar, enviar, aprobar y convertir cotizaciones en órdenes de trabajo con numeración automática y seguimiento completo de estados.

## 🗄️ **COMPONENTES IMPLEMENTADOS**

### **1. Página Principal de Cotizaciones** (`src/app/cotizaciones/page.tsx`)
- **Función**: Dashboard principal de cotizaciones
- **Características**:
  - Cards de métricas (total del mes, pendientes, aprobadas, conversión, valor)
  - Tabs de filtrado por estado (Todas, Borradores, Enviadas, Aprobadas, Rechazadas, Vencidas)
  - Tabla completa con información de cotizaciones
  - Dropdown de acciones (Ver PDF, Editar, Duplicar, Enviar Email, Convertir, Eliminar)
  - Detección automática de cotizaciones vencidas

### **2. Nueva Cotización** (`src/app/cotizaciones/nueva/page.tsx`)
- **Función**: Formulario completo para crear cotizaciones
- **Características**:
  - **Sección 1**: Información básica (cliente, vehículo, fechas, condiciones)
  - **Sección 2**: Items/Servicios con reutilización del AddItemModal
  - **Sección 3**: Términos y condiciones con editor de texto
  - **Sección 4**: Resumen con vista previa de totales
  - Botones: Guardar borrador, Enviar al cliente

### **3. Vista de Cotización** (`src/app/cotizaciones/[id]/page.tsx`)
- **Función**: Vista estilo factura profesional
- **Características**:
  - Header con datos de la empresa
  - Información completa del cliente y vehículo
  - Tabla detallada de servicios/productos
  - Resumen de totales con cálculos
  - Términos y condiciones
  - Acciones para aprobar, rechazar, convertir

## 🔌 **API ROUTES IMPLEMENTADAS**

### **1. CRUD de Cotizaciones**
- **`/api/quotations`** - GET (listar) y POST (crear)
- **`/api/quotations/[id]`** - GET, PATCH, DELETE
- **`/api/quotations/[id]/convert`** - POST (convertir a orden)
- **`/api/quotations/metrics`** - GET (métricas del dashboard)

### **2. APIs Auxiliares**
- **`/api/customers`** - Listar clientes
- **`/api/customers/[id]/vehicles`** - Vehículos de un cliente

## 📊 **FUNCIONES DE BASE DE DATOS**

### **Tablas Utilizadas**:
- **`quotations`** - Cotizaciones principales
- **`quotation_items`** - Items de cada cotización
- **`customers`** - Datos de clientes
- **`vehicles`** - Información de vehículos
- **`services`** - Catálogo de servicios
- **`inventory`** - Productos disponibles

### **Funciones Automáticas**:
- ✅ **Numeración automática**: COT-YYYYMM-0001
- ✅ **Cálculo de totales** automático
- ✅ **Detección de vencimiento** automática
- ✅ **Conversión a órdenes** con numeración ORD-YYYYMM-0001

## 🧮 **CÁLCULOS Y VALIDACIONES**

### **Fórmulas Implementadas**:
```typescript
// Cálculo de totales por item (igual que en órdenes)
subtotal = quantity × unit_price
discount_amount = subtotal × (discount_percent / 100)
tax_amount = (subtotal - discount_amount) × 0.16
total = subtotal - discount_amount + tax_amount

// Total de la cotización
grandTotal = sum(all_items.total)
```

### **Validaciones**:
- ✅ Cliente y vehículo requeridos
- ✅ Al menos un item en la cotización
- ✅ Fecha de validez requerida
- ✅ Verificación de stock para productos
- ✅ No permitir eliminar cotizaciones convertidas

## 🎨 **INTERFAZ DE USUARIO**

### **Página Principal**:
- **Métricas**: 5 cards con estadísticas clave
- **Filtros**: Tabs por estado con contadores
- **Tabla**: Información completa con acciones
- **Estados**: Badges con colores distintivos

### **Nueva Cotización**:
- **Formulario estructurado** en 4 secciones
- **Selección inteligente** de clientes y vehículos
- **Vista previa** de totales en tiempo real
- **Botones de acción** para guardar/enviar

### **Vista de Cotización**:
- **Diseño profesional** estilo factura
- **Información completa** de empresa, cliente, vehículo
- **Tabla detallada** de servicios/productos
- **Totales claros** con desglose
- **Acciones contextuales** según estado

## 🔄 **FLUJO DE TRABAJO**

### **1. Crear Cotización**:
1. Usuario hace clic en "Nueva Cotización"
2. Selecciona cliente y vehículo
3. Configura fechas y condiciones
4. Agrega servicios/productos
5. Define términos y condiciones
6. Ve resumen de totales
7. Guarda como borrador o envía al cliente

### **2. Gestión de Estados**:
- **Draft** → **Sent** → **Approved** → **Converted**
- **Draft** → **Sent** → **Rejected**
- **Sent** → **Expired** (automático)

### **3. Conversión a Orden**:
1. Cotización debe estar aprobada
2. Usuario hace clic en "Convertir a Orden"
3. Se genera orden con numeración ORD-YYYYMM-0001
4. Se copian todos los items a order_items
5. Se actualiza estado a "converted"
6. Redirige a la nueva orden

## 📱 **NAVEGACIÓN**

### **Enlaces Agregados**:
- **"Cotizaciones"** en el navbar principal
- **"Nueva Cotización"** desde la página principal
- **"Ver PDF"** desde la tabla de cotizaciones
- **"Editar"** desde acciones de dropdown

### **URLs**:
- **Lista**: `/cotizaciones`
- **Nueva**: `/cotizaciones/nueva`
- **Detalle**: `/cotizaciones/[id]`
- **API**: `/api/quotations/*`

## 🎯 **ESTADOS DE COTIZACIÓN**

### **Configuración de Estados**:
```typescript
const STATUS_CONFIG = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-800" },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Aprobada", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-800" },
  expired: { label: "Vencida", color: "bg-orange-100 text-orange-800" },
  converted: { label: "Convertida", color: "bg-purple-100 text-purple-800" }
}
```

### **Transiciones Permitidas**:
- **Draft** → **Sent** (enviar al cliente)
- **Sent** → **Approved** (cliente aprueba)
- **Sent** → **Rejected** (cliente rechaza)
- **Sent** → **Expired** (automático por fecha)
- **Approved** → **Converted** (convertir a orden)

## 🚀 **CÓMO USAR EL SISTEMA**

### **1. Crear Nueva Cotización**:
1. Ve a **Cotizaciones** en el menú
2. Haz clic en **"Nueva Cotización"**
3. Completa la información básica
4. Agrega servicios/productos
5. Define términos y condiciones
6. Guarda o envía al cliente

### **2. Gestionar Cotizaciones**:
1. Ve la lista de cotizaciones
2. Usa los filtros por estado
3. Haz clic en acciones del dropdown
4. Ve el detalle haciendo clic en "Ver PDF"

### **3. Convertir a Orden**:
1. Asegúrate que la cotización esté aprobada
2. Ve al detalle de la cotización
3. Haz clic en **"Convertir a Orden"**
4. Se crea automáticamente la orden
5. Se redirige a la nueva orden

## 🔧 **CONFIGURACIÓN NECESARIA**

### **1. Base de Datos**:
- Ejecutar migración SQL de `002_add_new_features.sql`
- Verificar que las tablas `quotations` y `quotation_items` existan
- Confirmar que RLS esté configurado

### **2. Variables de Entorno**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3. Dependencias**:
- Todas las dependencias ya están instaladas
- No se requieren instalaciones adicionales

## 🐛 **TROUBLESHOOTING**

### **Error: "Cliente no encontrado"**
- Verificar que el cliente existe en la tabla `customers`
- Confirmar que RLS permite el acceso

### **Error: "Vehículo no encontrado"**
- Verificar que el vehículo existe y pertenece al cliente
- Confirmar relación en tabla `vehicles`

### **Error: "No se puede convertir"**
- Verificar que la cotización esté en estado 'approved'
- Confirmar que no haya sido convertida anteriormente

## 🎯 **PRÓXIMOS PASOS**

1. **Probar el sistema** con datos reales
2. **Configurar clientes** y vehículos
3. **Crear cotizaciones** de prueba
4. **Probar conversión** a órdenes
5. **Implementar envío** de emails (futuro)

---

**¡El sistema de cotizaciones está completamente implementado y listo para usar!** 🎉

