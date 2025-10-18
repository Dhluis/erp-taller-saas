# 🧪 Guía de Testing para API de Cotizaciones

## 📋 **RESUMEN**

Suite completa de tests automatizados para todos los 15 endpoints del módulo de cotizaciones, incluyendo tests unitarios, de integración y de workflow completo.

---

## 🎯 **COBERTURA DE TESTS**

### **Tests Implementados: 30+**

| Categoría | Endpoints | Tests | Estado |
|-----------|-----------|-------|--------|
| **CRUD** | 5 endpoints | 10 tests | ✅ |
| **Items** | 4 endpoints | 8 tests | ✅ |
| **Workflow** | 5 endpoints | 10 tests | ✅ |
| **Métricas** | 1 endpoint | 2 tests | ✅ |
| **Integración** | Flujo completo | 1 test | ✅ |

---

## 📊 **ENDPOINTS TESTEADOS**

### **✅ 1. GET /api/quotations**
- Listar todas las cotizaciones
- Filtrar por status
- Filtrar por customer_id
- Filtrar por rango de fechas

### **✅ 2. POST /api/quotations**
- Crear cotización con número automático
- Validar campos requeridos
- Verificar estado inicial (`draft`)
- Verificar versión inicial (`1`)

### **✅ 3. GET /api/quotations/[id]**
- Obtener cotización completa
- Verificar inclusión de customer, vehicle, items
- Verificar totales calculados
- Manejo de 404 para IDs inexistentes

### **✅ 4. PUT /api/quotations/[id]**
- Actualizar cotización
- Verificar incremento de versión
- Validar no actualización de convertidas/canceladas

### **✅ 5. DELETE /api/quotations/[id]**
- Cancelar cotización (soft delete)
- Verificar cambio a status `cancelled`
- Verificar `cancelled_at` timestamp
- Validar no cancelación de convertidas

### **✅ 6. GET /api/quotations/[id]/items**
- Listar items con detalles
- Verificar totales consolidados
- Verificar contador de items

### **✅ 7. POST /api/quotations/[id]/items**
- Agregar item con validación de `product_id`
- Agregar item con validación de `service_id`
- Validar cantidad positiva
- Validar precio no negativo
- Verificar recálculo automático de totales
- Manejo de product_id inexistente (404)

### **✅ 8. PUT /api/quotations/[id]/items/[itemId]**
- Actualizar item
- Verificar recálculo de totales
- Validar cambios en quantity y unit_price

### **✅ 9. DELETE /api/quotations/[id]/items/[itemId]**
- Eliminar item
- Verificar recálculo de totales
- Verificar totales en 0 si no quedan items

### **✅ 10. POST /api/quotations/[id]/send**
- Enviar cotización al cliente
- Verificar cambio a status `sent`
- Verificar `sent_at` timestamp
- Validar no envío sin items
- Validar no envío sin cliente

### **✅ 11. POST /api/quotations/[id]/approve**
- Aprobar cotización `sent`
- Verificar cambio a status `approved`
- Verificar `approved_at` timestamp
- Verificar next_steps en response
- Validar solo aprobación de `sent`

### **✅ 12. POST /api/quotations/[id]/reject**
- Rechazar cotización
- Verificar cambio a status `rejected`
- Verificar `rejected_at` timestamp
- Guardar `rejection_reason`
- Verificar next_steps

### **✅ 13. POST /api/quotations/[id]/convert**
- Convertir cotización aprobada a orden
- Verificar generación de work_order_number
- Verificar copia de items
- Validar solo conversión de `approved`
- Verificar status final `converted`

### **✅ 14. POST /api/quotations/[id]/duplicate**
- Duplicar cotización
- Verificar nuevo número único
- Verificar copia de items
- Verificar estado inicial `draft`

### **✅ 15. GET /api/quotations/metrics**
- Obtener métricas generales
- Verificar estadísticas por status
- Verificar tasas de aprobación/conversión
- Verificar valores totales

---

## 🧪 **TEST DE INTEGRACIÓN**

### **Workflow Completo:**
```
1. Crear cotización (draft)
   ↓
2. Agregar items
   ↓
3. Enviar al cliente (sent)
   ↓
4. Aprobar (approved)
   ↓
5. Convertir a orden (converted)
   ↓
✅ Verificar orden creada
```

**Valida:**
- Transiciones de estados
- Integridad de datos
- Copia correcta de items
- Generación de números únicos
- Tracking en cada paso

---

## 🚀 **CÓMO EJECUTAR LOS TESTS**

### **Requisitos Previos:**

1. **Servidor corriendo:**
```bash
npm run dev
# Debe estar activo en http://localhost:3000
```

2. **Variables de entorno configuradas:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

3. **Datos de prueba en DB:**
```sql
-- Debes tener al menos:
- 1 customer
- 1 vehicle
- 1 product
- 1 service
```

### **Ejecutar Todos los Tests:**

```bash
# Opción 1: Comando simple
npm run test

# Opción 2: Solo tests de cotizaciones
npm run test tests/api/quotations/quotations.test.ts

# Opción 3: Con UI interactiva
npm run test:ui

# Opción 4: Con coverage
npm run test:coverage

# Opción 5: Script bash (Unix/Mac)
chmod +x tests/run-quotations-tests.sh
./tests/run-quotations-tests.sh
```

### **Ejecutar Tests Específicos:**

```bash
# Solo tests de CRUD
npm run test -- --grep "GET /api/quotations"

# Solo tests de workflow
npm run test -- --grep "POST /api/quotations/\[id\]/send"

# Solo test de integración
npm run test -- --grep "Integration"
```

---

## 📊 **ESTRUCTURA DE LOS TESTS**

```
tests/
├── setup.ts                          # Configuración global
├── api/
│   └── quotations/
│       └── quotations.test.ts        # Suite completa (30+ tests)
└── run-quotations-tests.sh           # Script de ejecución
```

### **Organización de la Suite:**

```typescript
describe('Quotations API - Complete Test Suite', () => {
  
  describe('GET /api/quotations', () => {
    it('should list all quotations')
    it('should filter quotations by status')
    it('should filter quotations by customer_id')
  })
  
  describe('POST /api/quotations', () => {
    it('should create a new quotation with auto-generated number')
    it('should fail without required fields')
  })
  
  // ... 13 más
  
  describe('Integration Tests', () => {
    it('should complete full workflow')
  })
})
```

---

## 🎯 **VALIDACIONES TESTEADAS**

### **1. Validaciones de Datos:**
- ✅ Campos requeridos
- ✅ Tipos de datos correctos
- ✅ Valores numéricos positivos
- ✅ Formato de IDs (UUID)
- ✅ Formato de números (Q-2024-0001)

### **2. Validaciones de Estados:**
- ✅ Transiciones válidas de status
- ✅ Operaciones permitidas por estado
- ✅ Timestamps correctos
- ✅ Versiones incrementales

### **3. Validaciones de Relaciones:**
- ✅ Existencia de product_id
- ✅ Existencia de service_id
- ✅ Existencia de customer_id
- ✅ Existencia de vehicle_id

### **4. Validaciones de Negocio:**
- ✅ No enviar sin items
- ✅ No aprobar sin estar enviada
- ✅ No convertir sin estar aprobada
- ✅ No modificar convertidas
- ✅ Stock disponible (warning)

### **5. Cálculos:**
- ✅ Recálculo automático de totales
- ✅ Aplicación de descuentos
- ✅ Cálculo de impuestos
- ✅ Totales por item
- ✅ Totales de cotización

---

## 📈 **COVERAGE ESPERADO**

### **Objetivo de Cobertura:**

| Componente | Objetivo | Actual |
|------------|----------|--------|
| **Líneas** | 80% | TBD |
| **Funciones** | 80% | TBD |
| **Branches** | 70% | TBD |
| **Statements** | 80% | TBD |

### **Ver Reporte de Coverage:**

```bash
npm run test:coverage

# Abrir reporte HTML
open coverage/index.html  # Mac
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

---

## 🐛 **DEBUGGING DE TESTS**

### **Test Falla?**

#### **1. Verificar Servidor:**
```bash
curl http://localhost:3000/api/quotations
# Debe retornar JSON
```

#### **2. Verificar Variables de Entorno:**
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### **3. Verificar Datos de Prueba:**
```sql
-- En Supabase SQL Editor
SELECT * FROM customers LIMIT 1;
SELECT * FROM vehicles LIMIT 1;
SELECT * FROM products LIMIT 1;
SELECT * FROM services LIMIT 1;
```

#### **4. Ver Logs Detallados:**
```bash
npm run test -- --reporter=verbose
```

#### **5. Ejecutar Test Individual:**
```bash
npm run test -- --grep "should create a new quotation"
```

---

## 🔧 **CONFIGURACIÓN**

### **vitest.config.ts:**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### **tests/setup.ts:**
```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Variables de entorno
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'

// Cleanup después de cada test
afterEach(() => {
  cleanup()
})
```

---

## 💡 **MEJORES PRÁCTICAS**

### **1. Aislamiento de Tests:**
- ✅ Cada test es independiente
- ✅ No dependen del orden de ejecución
- ✅ Crean sus propios datos de prueba
- ✅ Limpian después de ejecutarse

### **2. Nombres Descriptivos:**
```typescript
// ❌ Mal
it('test 1')

// ✅ Bien
it('should create a new quotation with auto-generated number')
```

### **3. Assertions Claras:**
```typescript
// ❌ Mal
expect(response.status).toBe(200)

// ✅ Bien
expect(response.status).toBe(201)
expect(data.data).toHaveProperty('id')
expect(data.data.quotation_number).toMatch(/^Q-\d{4}-\d{4}$/)
```

### **4. Manejo de Errores:**
```typescript
// Validar errores esperados
expect(response.status).toBe(400)
expect(await response.json()).toHaveProperty('error')
```

---

## 📚 **PRÓXIMOS TESTS**

### **Funcionalidades Adicionales:**

1. **Tests de Performance:**
   - Tiempo de respuesta < 500ms
   - Carga con 100 cotizaciones
   - Concurrencia de creación

2. **Tests de Seguridad:**
   - Validación de autenticación
   - Validación de autorización
   - Prevención de SQL injection

3. **Tests de Email:**
   - Envío de notificaciones
   - Templates correctos
   - Logs de envío

4. **Tests de Rollback:**
   - Fallos en conversión
   - Integridad de datos
   - Limpieza de errores

---

## 🎓 **EJEMPLO DE OUTPUT**

```bash
🧪 =====================================
🧪 TESTS DE API DE COTIZACIONES
🧪 =====================================

 ✓ tests/api/quotations/quotations.test.ts (30)
   ✓ Quotations API - Complete Test Suite (29)
     ✓ GET /api/quotations (3)
       ✓ should list all quotations
       ✓ should filter quotations by status
       ✓ should filter quotations by customer_id
     ✓ POST /api/quotations (2)
       ✓ should create a new quotation with auto-generated number
       ✓ should fail without required fields
     ✓ GET /api/quotations/[id] (2)
       ✓ should get quotation with full details
       ✓ should return 404 for non-existent quotation
     ... (más tests)
   ✓ Integration Tests (1)
     ✓ should complete full workflow

 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  14:30:00
   Duration  5.43s

✅ Full workflow completed successfully!
   Quotation: Q-2024-0125
   Work Order: WO-2024-0089
```

---

## 🚀 **CI/CD INTEGRATION**

### **GitHub Actions Example:**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

**✅ Suite Completa de Tests Implementada**
**🧪 30+ Tests Automatizados**
**📊 Cobertura de 15 Endpoints**
**🔄 Test de Workflow Completo**
**📈 Coverage Reports**
**🎯 Listo para CI/CD**


