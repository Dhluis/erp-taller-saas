# 🧪 Tests Automatizados - ERP Taller SaaS

## 📋 **RESUMEN**

Suite completa de tests automatizados para el módulo de cotizaciones del ERP, incluyendo tests unitarios, de integración y de workflow completo.

---

## 📊 **ESTADÍSTICAS**

- **Total de Tests**: 30+
- **Endpoints Cubiertos**: 15/15 (100%)
- **Categorías**: CRUD, Items, Workflow, Métricas, Integración
- **Framework**: Vitest + Testing Library
- **Coverage Objetivo**: 80%

---

## 🚀 **INICIO RÁPIDO**

### **1. Instalar Dependencias** (si no lo has hecho):
```bash
npm install
```

### **2. Preparar Datos de Prueba**:
```bash
# En Supabase SQL Editor, ejecutar:
tests/seed-test-data.sql
```

### **3. Iniciar Servidor**:
```bash
npm run dev
# Dejar corriendo en http://localhost:3000
```

### **4. Ejecutar Tests**:
```bash
# Terminal nueva:
npm run test

# O con UI interactiva:
npm run test:ui

# O con coverage:
npm run test:coverage
```

---

## 📁 **ESTRUCTURA**

```
tests/
├── README.md                     # Este archivo
├── setup.ts                      # Configuración global de tests
├── seed-test-data.sql            # Datos de prueba para DB
├── run-quotations-tests.sh       # Script bash para ejecutar
└── api/
    └── quotations/
        └── quotations.test.ts    # 30+ tests de cotizaciones
```

---

## 🧪 **TESTS DISPONIBLES**

### **1. Tests de CRUD (10 tests)**
- `GET /api/quotations` - Listar y filtrar
- `POST /api/quotations` - Crear con validaciones
- `GET /api/quotations/[id]` - Obtener completa
- `PUT /api/quotations/[id]` - Actualizar con versionado
- `DELETE /api/quotations/[id]` - Cancelar (soft delete)

### **2. Tests de Items (8 tests)**
- `GET /api/quotations/[id]/items` - Listar items
- `POST /api/quotations/[id]/items` - Agregar con validaciones
- `PUT /api/quotations/[id]/items/[itemId]` - Actualizar
- `DELETE /api/quotations/[id]/items/[itemId]` - Eliminar

### **3. Tests de Workflow (10 tests)**
- `POST /api/quotations/[id]/send` - Enviar
- `POST /api/quotations/[id]/approve` - Aprobar
- `POST /api/quotations/[id]/reject` - Rechazar
- `POST /api/quotations/[id]/convert` - Convertir a orden
- `POST /api/quotations/[id]/duplicate` - Duplicar

### **4. Tests de Métricas (2 tests)**
- `GET /api/quotations/metrics` - Obtener estadísticas

### **5. Test de Integración (1 test)**
- Workflow completo: crear → enviar → aprobar → convertir

---

## ✅ **VALIDACIONES TESTEADAS**

### **Validaciones de Datos:**
- ✅ Campos requeridos
- ✅ Tipos de datos correctos
- ✅ Valores numéricos positivos
- ✅ Formato de UUIDs
- ✅ Formato de números generados

### **Validaciones de Estados:**
- ✅ Transiciones válidas
- ✅ Operaciones permitidas por estado
- ✅ Timestamps correctos
- ✅ Versionado incremental

### **Validaciones de Relaciones:**
- ✅ Existencia de product_id
- ✅ Existencia de service_id
- ✅ Existencia de customer_id
- ✅ Existencia de vehicle_id

### **Validaciones de Negocio:**
- ✅ No enviar sin items
- ✅ No aprobar sin estar enviada
- ✅ No convertir sin estar aprobada
- ✅ No modificar convertidas
- ✅ Recálculo automático de totales

---

## 🎯 **COMANDOS ÚTILES**

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar con UI interactiva
npm run test:ui

# Ejecutar con coverage
npm run test:coverage

# Ejecutar tests específicos
npm run test -- --grep "GET /api/quotations"

# Ejecutar en modo watch
npm run test -- --watch

# Ejecutar con output verboso
npm run test -- --reporter=verbose

# Ver coverage en HTML
npm run test:coverage
open coverage/index.html
```

---

## 📈 **INTERPRETAR RESULTADOS**

### **Ejemplo de Output Exitoso:**
```
✓ tests/api/quotations/quotations.test.ts (30)
  ✓ Quotations API - Complete Test Suite (29)
    ✓ GET /api/quotations (3)
    ✓ POST /api/quotations (2)
    ...

Test Files  1 passed (1)
     Tests  30 passed (30)
  Duration  5.43s

✅ Full workflow completed successfully!
```

### **Ejemplo de Test Fallido:**
```
✗ should create a new quotation with auto-generated number
  AssertionError: expected 500 to be 201
  
  Stack trace:
    at quotations.test.ts:52:28
```

---

## 🐛 **TROUBLESHOOTING**

### **Error: "Servidor no responde"**
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:3000/api/quotations

# Solución: Iniciar el servidor
npm run dev
```

### **Error: "customer_id not found"**
```bash
# Ejecutar script de datos de prueba
# En Supabase SQL Editor:
tests/seed-test-data.sql
```

### **Error: "Variables de entorno"**
```bash
# Verificar .env.local
cat .env.local

# Debe contener:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### **Tests lentos**
```bash
# Ejecutar solo tests rápidos
npm run test -- --exclude-slow

# O ejecutar en paralelo
npm run test -- --threads
```

---

## 🔧 **CONFIGURACIÓN**

### **vitest.config.ts**
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
})
```

### **tests/setup.ts**
```typescript
// Configuración de env vars
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'

// Cleanup después de cada test
afterEach(() => {
  cleanup()
})
```

---

## 📚 **DOCUMENTACIÓN RELACIONADA**

- **QUOTATIONS_TESTING_GUIDE.md** - Guía completa de testing
- **QUOTATIONS_API_COMPLETE_REFERENCE.md** - Referencia de API
- **tests/seed-test-data.sql** - Script de datos de prueba

---

## 🎓 **MEJORES PRÁCTICAS**

### **1. Antes de Commit:**
```bash
npm run test
npm run type-check
npm run lint
```

### **2. Desarrollo Local:**
```bash
# Terminal 1: Servidor
npm run dev

# Terminal 2: Tests en watch mode
npm run test -- --watch
```

### **3. CI/CD:**
```bash
npm run test:coverage
# Verificar coverage > 80%
```

### **4. Debugging:**
```bash
# Ejecutar test individual con logs
npm run test -- --grep "should create" --reporter=verbose
```

---

## 🚀 **PRÓXIMOS PASOS**

### **Tests Adicionales Sugeridos:**

1. **Performance Tests**
   - Tiempo de respuesta < 500ms
   - Carga con 1000 cotizaciones
   - Concurrencia

2. **Security Tests**
   - Autenticación
   - Autorización
   - SQL Injection

3. **E2E Tests**
   - Flujo completo en UI
   - Interacción usuario
   - Navegación

4. **Load Tests**
   - Artillery o k6
   - Stress testing
   - Límites del sistema

---

## 📊 **MÉTRICAS DE CALIDAD**

### **Objetivos:**
- **Coverage**: > 80%
- **Test Pass Rate**: 100%
- **Execution Time**: < 10s
- **Flakiness**: 0%

### **Verificar Coverage:**
```bash
npm run test:coverage

# Output:
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
All files |   85.3  |   78.9   |   90.1  |   86.7
```

---

## 💡 **TIPS**

1. **Ejecutar antes de PR**: Siempre corre todos los tests
2. **Mantener rápidos**: Tests < 10s total
3. **Nombres descriptivos**: `should create quotation with auto-generated number`
4. **Un concepto por test**: No testear múltiples cosas
5. **Datos aislados**: Cada test crea sus datos
6. **Cleanup**: Limpiar después de cada test

---

## 🏆 **ESTADO ACTUAL**

```
✅ Suite completa implementada
✅ 30+ tests funcionando
✅ 15 endpoints cubiertos
✅ Test de integración incluido
✅ Documentación completa
✅ Scripts de automatización
✅ Datos de prueba preparados
✅ Configuración de Vitest
✅ Listo para CI/CD
```

---

**🧪 Tests Listos para Ejecutar**
**📊 Cobertura Completa de Endpoints**
**🚀 Integración Continua**
**📈 Métricas de Calidad**

Para más información, consulta **QUOTATIONS_TESTING_GUIDE.md**


