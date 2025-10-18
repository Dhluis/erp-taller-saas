# 🚗 MÓDULO DE VEHÍCULOS - DOCUMENTACIÓN COMPLETA

## ✅ **ESTADO: PRODUCCIÓN READY**

Módulo completo de gestión de vehículos implementado siguiendo el patrón exitoso de cotizaciones.

---

## 📊 **RESUMEN EJECUTIVO**

| Componente | Estado | Cantidad |
|------------|--------|----------|
| **Endpoints REST** | ✅ 100% | 8 endpoints |
| **Queries** | ✅ 100% | 8 funciones |
| **Validaciones** | ✅ 100% | 10+ validaciones |
| **Documentación** | ✅ 100% | Este documento |

---

## 🗂️ **ESTRUCTURA DE ARCHIVOS**

```
src/
├── lib/database/queries/
│   └── ✅ vehicles.ts                        # 8 funciones de query
│
└── app/api/
    ├── vehicles/
    │   ├── ✅ route.ts                       # GET (lista), POST (crear)
    │   ├── [id]/
    │   │   ├── ✅ route.ts                   # GET, PUT, DELETE
    │   │   └── history/
    │   │       └── ✅ route.ts               # GET historial completo
    │   └── search/
    │       └── ✅ route.ts                   # GET búsqueda inteligente
    │
    └── customers/
        └── [id]/vehicles/
            └── ✅ route.ts                   # GET, POST (por cliente)
```

---

## 📋 **ENDPOINTS IMPLEMENTADOS (8 TOTAL)**

### **1. GET /api/vehicles** 📄
Lista vehículos con filtros opcionales.

**Query Params:**
- `organization_id` - ID de la organización
- `customer_id` - Filtrar por cliente
- `brand` - Filtrar por marca
- `year` - Filtrar por año
- `search` - Búsqueda en placa, VIN, marca, modelo

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2020,
      "license_plate": "ABC-123",
      "vin": "1234567890ABCDEFG",
      "color": "Blanco",
      "mileage": 50000,
      "customers": {
        "id": "uuid",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "555-1234"
      }
    }
  ],
  "error": null
}
```

---

### **2. POST /api/vehicles** ➕
Crea un nuevo vehículo.

**Body (requerido):**
```json
{
  "customer_id": "uuid",              // ✅ Requerido
  "brand": "Toyota",                  // ✅ Requerido
  "model": "Corolla",                 // ✅ Requerido
  "year": 2020,                       // ❌ Opcional (1900 - año actual + 1)
  "license_plate": "ABC-123",         // ❌ Opcional (único por organización)
  "vin": "1234567890ABCDEFG",         // ❌ Opcional (exactamente 17 caracteres)
  "color": "Blanco",                  // ❌ Opcional
  "mileage": 50000,                   // ❌ Opcional (no negativo)
  "notes": "Notas adicionales"        // ❌ Opcional
}
```

**Validaciones:**
- ✅ `customer_id` requerido
- ✅ `brand` requerido
- ✅ `model` requerido
- ✅ `year` entre 1900 y año actual + 1
- ✅ `vin` exactamente 17 caracteres
- ✅ `mileage` no negativo
- ✅ `license_plate` único por organización

---

### **3. GET /api/vehicles/[id]** 🔍
Obtiene un vehículo específico con información del cliente.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "customer_id": "uuid",
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "license_plate": "ABC-123",
    "vin": "1234567890ABCDEFG",
    "color": "Blanco",
    "mileage": 50000,
    "customers": {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "phone": "555-1234",
      "address": "Calle Principal 123"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

---

### **4. PUT /api/vehicles/[id]** ✏️
Actualiza un vehículo existente.

**Body (todos opcionales):**
```json
{
  "customer_id": "uuid",
  "brand": "Honda",
  "model": "Civic",
  "year": 2021,
  "license_plate": "XYZ-789",
  "vin": "9876543210ZYXWVUT",
  "color": "Rojo",
  "mileage": 60000,
  "notes": "Actualizadas"
}
```

**Validaciones:**
- ✅ Mismas validaciones que POST
- ✅ Si cambia `license_plate`, verifica unicidad

---

### **5. DELETE /api/vehicles/[id]** 🗑️
Elimina un vehículo (con validación de dependencias).

**Validaciones:**
- ✅ No puede tener órdenes de trabajo asociadas
- ✅ No puede tener cotizaciones asociadas

**Response Error (409):**
```json
{
  "data": null,
  "error": "No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas"
}
```

---

### **6. GET /api/vehicles/[id]/history** 📜
Obtiene el historial completo de servicios del vehículo.

**Response:**
```json
{
  "data": {
    "vehicle": {
      "id": "uuid",
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2020,
      "license_plate": "ABC-123",
      "customer": {
        "id": "uuid",
        "name": "Juan Pérez"
      }
    },
    "history": {
      "work_orders": [
        {
          "id": "uuid",
          "order_number": "WO-2024-0001",
          "status": "completed",
          "description": "Cambio de aceite",
          "total_amount": 500.00,
          "created_at": "2024-01-10T10:00:00Z"
        }
      ],
      "quotations": [
        {
          "id": "uuid",
          "quotation_number": "Q-2024-0001",
          "status": "approved",
          "description": "Mantenimiento general",
          "total_amount": 1500.00,
          "created_at": "2024-01-05T14:00:00Z"
        }
      ],
      "work_orders_count": 5,
      "quotations_count": 3,
      "total_spent": 7500.00
    },
    "summary": {
      "total_services": 5,
      "total_quotations": 3,
      "total_amount_spent": 7500.00,
      "last_service": { /* última orden */ },
      "last_quotation": { /* última cotización */ }
    }
  },
  "error": null
}
```

**Incluye:**
- ✅ Todas las órdenes de trabajo
- ✅ Todas las cotizaciones
- ✅ Total gastado (solo órdenes completadas)
- ✅ Último servicio
- ✅ Última cotización
- ✅ Resumen de estadísticas

---

### **7. GET /api/vehicles/search** 🔎
Búsqueda inteligente de vehículos.

**Query Params:**
- `q` o `query` - Término de búsqueda (mínimo 2 caracteres)
- `organization_id` - ID de la organización

**Busca en:**
- Placa (license_plate)
- VIN
- Marca (brand)
- Modelo (model)

**Características:**
- ✅ Case insensitive
- ✅ Búsqueda parcial
- ✅ Limita a 20 resultados
- ✅ Ordenado por fecha de creación

**Response:**
```json
{
  "data": {
    "query": "toyota",
    "results": [
      {
        "id": "uuid",
        "brand": "Toyota",
        "model": "Corolla",
        "license_plate": "ABC-123",
        "customers": {
          "name": "Juan Pérez"
        }
      }
    ],
    "count": 1
  },
  "error": null
}
```

---

### **8. GET /api/customers/[id]/vehicles** 👤
Obtiene todos los vehículos de un cliente específico.

**Response:**
```json
{
  "data": {
    "customer_id": "uuid",
    "vehicles": [
      {
        "id": "uuid",
        "brand": "Toyota",
        "model": "Corolla",
        "year": 2020,
        "license_plate": "ABC-123"
      }
    ],
    "count": 1
  },
  "error": null
}
```

---

## 🔧 **FUNCIONES DE QUERY (8)**

### **src/lib/database/queries/vehicles.ts**

```typescript
1. getAllVehicles(organizationId, filters?)
   - Lista con filtros opcionales
   - Incluye información del cliente
   - Ordenado por fecha de creación

2. getVehicleById(id)
   - Obtiene vehículo con cliente
   - Información completa

3. getVehiclesByCustomer(customerId)
   - Todos los vehículos de un cliente
   - Ordenado por fecha

4. getVehicleWithHistory(id)
   - Vehículo + work_orders + quotations
   - Calcula total gastado
   - Resumen de estadísticas

5. createVehicle(data)
   - Validaciones exhaustivas
   - Verifica unicidad de placa
   - Retorna con información del cliente

6. updateVehicle(id, data)
   - Validaciones exhaustivas
   - Verifica unicidad de placa si cambia
   - Actualiza timestamp

7. deleteVehicle(id)
   - Valida que no tenga órdenes
   - Valida que no tenga cotizaciones
   - Eliminación física

8. searchVehicles(organizationId, query)
   - Búsqueda en múltiples campos
   - Case insensitive
   - Limita resultados
```

---

## ✅ **VALIDACIONES IMPLEMENTADAS**

### **Validaciones de Datos:**

```typescript
1. year: Entre 1900 y año actual + 1
   Error: "El año debe estar entre 1900 y 2026"

2. vin: Exactamente 17 caracteres (si se proporciona)
   Error: "El VIN debe tener exactamente 17 caracteres"

3. mileage: No negativo
   Error: "El kilometraje no puede ser negativo"

4. license_plate: Único por organización
   Error: "La placa ABC-123 ya está registrada"

5. customer_id: Requerido
   Error: "customer_id es requerido"

6. brand: Requerido
   Error: "brand es requerido"

7. model: Requerido
   Error: "model es requerido"
```

### **Validaciones de Negocio:**

```typescript
8. No eliminar si tiene work_orders
   Error: "No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas"

9. No eliminar si tiene quotations
   Error: "No se puede eliminar el vehículo porque tiene cotizaciones asociadas"

10. Búsqueda mínimo 2 caracteres
    Error: "La búsqueda debe tener al menos 2 caracteres"
```

---

## 📊 **ESTRUCTURA DE DATOS**

### **Tabla: vehicles**

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    license_plate VARCHAR(20),              -- Único por organización
    vin VARCHAR(17),                        -- Exactamente 17 caracteres
    color VARCHAR(50),
    mileage INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_license_plate_per_org 
        UNIQUE (organization_id, license_plate),
    CONSTRAINT valid_year 
        CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
    CONSTRAINT valid_vin_length 
        CHECK (vin IS NULL OR LENGTH(vin) = 17),
    CONSTRAINT non_negative_mileage 
        CHECK (mileage >= 0)
);
```

---

## 💡 **EJEMPLOS DE USO**

### **Ejemplo 1: Crear Vehículo**

```javascript
const response = await fetch('http://localhost:3001/api/vehicles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_id: 'customer-uuid',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    license_plate: 'ABC-123',
    vin: '1234567890ABCDEFG',
    color: 'Blanco',
    mileage: 50000
  })
})

const { data, error } = await response.json()
console.log('Vehículo creado:', data.id)
```

### **Ejemplo 2: Buscar Vehículos**

```javascript
const response = await fetch('http://localhost:3001/api/vehicles/search?q=toyota')
const { data } = await response.json()

console.log(`Encontrados: ${data.count} vehículos`)
data.results.forEach(v => {
  console.log(`- ${v.brand} ${v.model} (${v.license_plate})`)
})
```

### **Ejemplo 3: Ver Historial**

```javascript
const response = await fetch('http://localhost:3001/api/vehicles/[id]/history')
const { data } = await response.json()

console.log(`Total gastado: $${data.history.total_spent}`)
console.log(`Servicios: ${data.history.work_orders_count}`)
console.log(`Cotizaciones: ${data.history.quotations_count}`)
```

### **Ejemplo 4: Vehículos de un Cliente**

```javascript
const response = await fetch('http://localhost:3001/api/customers/[id]/vehicles')
const { data } = await response.json()

console.log(`Cliente tiene ${data.count} vehículos`)
```

---

## 🎯 **CASOS DE USO**

### **Caso 1: Registro de Nuevo Vehículo**
1. Cliente llega al taller
2. Registrar sus datos (POST /api/customers)
3. Registrar su vehículo (POST /api/vehicles)
4. Crear orden de trabajo (POST /api/orders)

### **Caso 2: Consulta de Historial**
1. Cliente pregunta por su vehículo
2. Buscar por placa (GET /api/vehicles/search?q=ABC-123)
3. Ver historial completo (GET /api/vehicles/[id]/history)
4. Mostrar servicios anteriores y total gastado

### **Caso 3: Actualización de Kilometraje**
1. Vehículo llega para servicio
2. Actualizar mileage (PUT /api/vehicles/[id])
3. Crear nueva orden con kilometraje actual

### **Caso 4: Cliente con Múltiples Vehículos**
1. Ver todos sus vehículos (GET /api/customers/[id]/vehicles)
2. Seleccionar cuál va a servicio
3. Crear orden para ese vehículo específico

---

## 🔄 **INTEGRACIÓN CON OTROS MÓDULOS**

### **Con Customers:**
- ✅ Relación: `vehicles.customer_id → customers.id`
- ✅ Vehículos incluyen info del cliente
- ✅ Endpoint específico por cliente

### **Con Work Orders:**
- ✅ Relación: `work_orders.vehicle_id → vehicles.id`
- ✅ Historial incluye todas las órdenes
- ✅ Validación para no eliminar si tiene órdenes

### **Con Quotations:**
- ✅ Relación: `quotations.vehicle_id → vehicles.id`
- ✅ Historial incluye todas las cotizaciones
- ✅ Validación para no eliminar si tiene cotizaciones

---

## 🏆 **ESTADO FINAL**

```
╔══════════════════════════════════════╗
║                                      ║
║   ✅  MÓDULO 100% COMPLETADO         ║
║                                      ║
║   📊  8 Endpoints REST               ║
║   🔧  8 Funciones de Query           ║
║   ✅  10+ Validaciones               ║
║   📜  Historial Completo             ║
║   🔍  Búsqueda Inteligente           ║
║   🚀  Listo para Producción          ║
║                                      ║
╚══════════════════════════════════════╝
```

---

**🚗 MÓDULO DE VEHÍCULOS COMPLETADO**
**✅ 8 Endpoints Implementados**
**🔧 8 Queries Refactorizadas**
**✅ 10+ Validaciones Exhaustivas**
**📜 Historial de Servicios**
**🔍 Búsqueda Inteligente**
**🚀 PRODUCCIÓN READY**


