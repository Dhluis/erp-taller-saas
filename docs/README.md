# ERP Taller SaaS - Documentación Completa

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [Uso](#uso)
6. [API](#api)
7. [Testing](#testing)
8. [Despliegue](#despliegue)
9. [Contribución](#contribución)
10. [Licencia](#licencia)

## 🚀 Introducción

ERP Taller SaaS es una aplicación web moderna construida con Next.js 14, TypeScript, Supabase y Tailwind CSS. Proporciona una solución completa para la gestión de talleres automotrices, incluyendo:

- **Gestión de Clientes**: Registro y seguimiento de clientes
- **Gestión de Vehículos**: Información de vehículos por cliente
- **Gestión de Inventario**: Control de stock y movimientos
- **Gestión de Órdenes**: Órdenes de trabajo y seguimiento
- **Gestión de Cobros**: Control de pagos y facturación
- **Gestión de Proveedores**: Administración de proveedores
- **Reportes y Analytics**: Métricas y estadísticas

## 🏗️ Arquitectura

### Fase 1: Fundamentos
- ✅ **Sistema de Configuración Centralizada**
- ✅ **Manejo de Errores Robusto**
- ✅ **Cliente Supabase Singleton**

### Fase 2: Tipos y Validación
- ✅ **Tipos Base Centralizados**
- ✅ **Esquemas de Validación con Zod**
- ✅ **Hooks de Validación Reutilizables**

### Fase 3: Servicios de Datos
- ✅ **Servicio Base Abstracto**
- ✅ **Servicios Específicos por Entidad**
- ✅ **Hooks de Servicios con Operaciones CRUD**

### Fase 4: Componentes Reutilizables
- ✅ **DataTable con Paginación y Búsqueda**
- ✅ **FormField con Validación Automática**
- ✅ **Form Completo con Esquemas**
- ✅ **StatsCard con Métricas**
- ✅ **PageLayout Responsive**
- ✅ **Modal con Diferentes Variantes**

### Fase 5: Integración y Testing
- ✅ **Sistema de Testing Completo**
- ✅ **Tests de Integración**
- ✅ **Documentación Completa**

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Git

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/erp-taller-saas.git
cd erp-taller-saas
```

2. **Instalar dependencias**
```bash
npm install
# o
yarn install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

4. **Configurar Supabase**
   - Crear proyecto en Supabase
   - Ejecutar migraciones SQL
   - Configurar variables de entorno

5. **Ejecutar en desarrollo**
```bash
npm run dev
# o
yarn dev
```

## ⚙️ Configuración

### Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio

# Aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Configuración de Supabase

1. **Crear proyecto en Supabase**
2. **Ejecutar migraciones SQL** (ver `supabase/migrations/`)
3. **Configurar Row Level Security (RLS)**
4. **Configurar políticas de acceso**

### Configuración de Base de Datos

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver archivo: SOLUCION_COMPLETA_FINAL.sql
```

## 📖 Uso

### Estructura del Proyecto

```
src/
├── app/                    # Páginas de Next.js
├── components/             # Componentes reutilizables
│   └── ui/                # Componentes UI base
├── hooks/                 # Hooks personalizados
├── lib/                   # Utilidades y configuración
│   ├── config/           # Configuración centralizada
│   ├── errors/           # Manejo de errores
│   ├── services/         # Servicios de datos
│   ├── supabase/         # Cliente Supabase
│   ├── testing/          # Utilidades de testing
│   └── utils/            # Utilidades generales
├── types/                # Tipos TypeScript
└── __tests__/            # Tests
```

### Componentes Principales

#### DataTable
```tsx
import { DataTable } from '@/components/ui/DataTable'

<DataTable
  data={customers}
  columns={columns}
  searchable={true}
  filterable={true}
  sortable={true}
  pagination={pagination}
  actions={{
    view: (row) => viewCustomer(row),
    edit: (row) => editCustomer(row),
    delete: (row) => deleteCustomer(row)
  }}
/>
```

#### Form
```tsx
import { Form } from '@/components/ui/Form'

<Form
  title="Crear Cliente"
  fields={formFields}
  schema={createCustomerSchema}
  onSubmit={handleSubmit}
  gridCols={2}
  showSuccessMessage={true}
/>
```

#### StatsCard
```tsx
import { StatsCard } from '@/components/ui/StatsCard'

<StatsCard
  title="Total Clientes"
  value={150}
  change={12.5}
  changeType="increase"
  variant="success"
  onRefresh={loadStats}
/>
```

### Hooks de Servicios

#### useCollections
```tsx
import { useCollections } from '@/hooks/useServices'

const { 
  stats, 
  loading, 
  error, 
  loadStats, 
  getPending, 
  getOverdue,
  markAsCompleted 
} = useCollections()
```

#### useCustomers
```tsx
import { useCustomers } from '@/hooks/useServices'

const { 
  data, 
  loading, 
  error, 
  create, 
  update, 
  remove,
  getActive,
  getVIP,
  searchByNameOrEmail 
} = useCustomers()
```

### Servicios de Datos

#### CollectionsService
```tsx
import { CollectionsService } from '@/lib/services/CollectionsService'

const service = new CollectionsService()

// Obtener todas las colecciones
const collections = await service.getAll()

// Obtener estadísticas
const stats = await service.getStats()

// Crear nueva colección
const newCollection = await service.create({
  client_id: 'C001',
  invoice_id: 'F001',
  amount: 1000,
  collection_date: '2024-01-01',
  payment_method: 'transfer'
})
```

## 🔌 API

### Endpoints de Supabase

#### Clientes
- `GET /customers` - Obtener todos los clientes
- `GET /customers/:id` - Obtener cliente por ID
- `POST /customers` - Crear nuevo cliente
- `PUT /customers/:id` - Actualizar cliente
- `DELETE /customers/:id` - Eliminar cliente

#### Colecciones
- `GET /collections` - Obtener todas las colecciones
- `GET /collections/stats` - Obtener estadísticas
- `GET /collections/pending` - Obtener colecciones pendientes
- `GET /collections/overdue` - Obtener colecciones vencidas

### Esquemas de Validación

#### Cliente
```typescript
interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

#### Colección
```typescript
interface Collection {
  id: string
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: 'cash' | 'transfer' | 'card' | 'check'
  status: 'pending' | 'completed' | 'overdue'
  created_at: string
  updated_at: string
}
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:integration

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

### Estructura de Tests

```
__tests__/
├── components/           # Tests de componentes
├── services/            # Tests de servicios
├── integration/         # Tests de integración
└── utils/              # Tests de utilidades
```

### Ejemplos de Tests

#### Test de Componente
```typescript
import { render, screen, fireEvent } from '@/lib/testing/test-utils'
import { DataTable } from '@/components/ui/DataTable'

describe('DataTable', () => {
  it('debe renderizar datos correctamente', () => {
    render(<DataTable data={mockData} columns={columns} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })
})
```

#### Test de Servicio
```typescript
import { CollectionsService } from '@/lib/services/CollectionsService'

describe('CollectionsService', () => {
  it('debe crear colección correctamente', async () => {
    const service = new CollectionsService()
    const result = await service.create(mockData)
    expect(result).toBeDefined()
  })
})
```

## 🚀 Despliegue

### Despliegue en Vercel

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno**
3. **Configurar dominio personalizado**
4. **Desplegar automáticamente**

### Despliegue en Netlify

1. **Conectar repositorio a Netlify**
2. **Configurar build settings**
3. **Configurar variables de entorno**
4. **Desplegar**

### Despliegue Manual

1. **Build de producción**
```bash
npm run build
```

2. **Iniciar servidor**
```bash
npm start
```

### Configuración de Producción

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

## 🤝 Contribución

### Cómo Contribuir

1. **Fork del repositorio**
2. **Crear rama de feature**
```bash
git checkout -b feature/nueva-funcionalidad
```

3. **Hacer cambios y commits**
```bash
git commit -m "feat: agregar nueva funcionalidad"
```

4. **Push a la rama**
```bash
git push origin feature/nueva-funcionalidad
```

5. **Crear Pull Request**

### Estándares de Código

- **TypeScript** para tipado fuerte
- **ESLint** para linting
- **Prettier** para formato
- **Conventional Commits** para commits
- **Tests** para nuevas funcionalidades

### Estructura de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato
refactor: refactoring
test: tests
chore: tareas de mantenimiento
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

- **Email**: soporte@erp-taller.com
- **GitHub Issues**: [Crear issue](https://github.com/tu-usuario/erp-taller-saas/issues)
- **Documentación**: [Ver documentación](https://docs.erp-taller.com)

## 🙏 Agradecimientos

- **Next.js** - Framework de React
- **Supabase** - Backend como servicio
- **Tailwind CSS** - Framework de CSS
- **Shadcn/ui** - Componentes UI
- **Zod** - Validación de esquemas
- **React Hook Form** - Manejo de formularios
- **Jest** - Framework de testing
- **Testing Library** - Utilidades de testing

---

**ERP Taller SaaS** - Solución completa para gestión de talleres automotrices 🚗







