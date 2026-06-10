# 🔒 Utilidades Seguras de Fetch

Este módulo proporciona utilidades seguras para realizar peticiones HTTP en el proyecto, manejando automáticamente errores de red, HTTP, JSON parsing y respuestas HTML inesperadas.

## 🚀 Características

- ✅ **Validación automática** de `response.ok`
- ✅ **Detección de respuestas HTML** en lugar de JSON
- ✅ **Manejo robusto de errores** de red, HTTP y parsing
- ✅ **Sistema de reintentos** configurable
- ✅ **Timeout automático** para evitar cuelgues
- ✅ **Tipado completo** con TypeScript
- ✅ **Hook para React** incluido

## 📦 Instalación

```typescript
import { 
  safeFetch, 
  safeGet, 
  safePost, 
  handleApiError,
  useSafeFetch 
} from '@/lib/api';
```

## 🔧 Uso Básico

### 1. Fetch Simple

```typescript
import { safeFetch } from '@/lib/api';

const result = await safeFetch('/api/customers');

if (result.success) {
  console.log('Datos:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### 2. Métodos HTTP Específicos

```typescript
import { safeGet, safePost, safePut, safeDelete } from '@/lib/api';

// GET
const customers = await safeGet('/api/customers');

// POST
const newCustomer = await safePost('/api/customers', {
  name: 'Juan Pérez',
  email: 'juan@example.com'
});

// PUT
const updatedCustomer = await safePut('/api/customers/123', {
  name: 'Juan Carlos Pérez'
});

// DELETE
const deleted = await safeDelete('/api/customers/123');
```

### 3. Configuración Avanzada

```typescript
const result = await safeFetch('/api/customers', {
  timeout: 15000,        // 15 segundos
  retries: 3,           // 3 reintentos
  retryDelay: 2000,     // 2 segundos entre reintentos
  headers: {
    'Authorization': 'Bearer token',
  },
});
```

## 🎣 Hook para React

```typescript
import { useSafeFetch } from '@/lib/api';

function CustomersComponent() {
  const { fetchData, loading, error } = useSafeFetch();
  
  const loadCustomers = async () => {
    const result = await fetchData('/api/customers');
    
    if (result.success) {
      setCustomers(result.data);
    } else {
      setError(result.error);
    }
  };
  
  return (
    <div>
      {loading && <p>Cargando...</p>}
      {error && <p>Error: {error}</p>}
      {/* Resto del componente */}
    </div>
  );
}
```

## 🛠️ Manejo de Errores

### Tipos de Errores Manejados

1. **Errores de Red**: Conexión perdida, DNS, etc.
2. **Errores HTTP**: 404, 500, 403, etc.
3. **Errores de JSON**: Respuesta no válida
4. **Respuestas HTML**: Servidor devuelve HTML en lugar de JSON
5. **Timeouts**: Peticiones que tardan demasiado

### Normalización de Errores

```typescript
import { handleApiError } from '@/lib/api';

try {
  const result = await safeFetch('/api/endpoint');
} catch (error) {
  const apiError = handleApiError(error);
  
  switch (apiError.code) {
    case 'NETWORK_ERROR':
      console.error('Error de red');
      break;
    case 'HTTP_404':
      console.error('Recurso no encontrado');
      break;
    case 'JSON_PARSE_ERROR':
      console.error('Error al procesar respuesta');
      break;
  }
}
```

## 📋 Ejemplos Completos

### Hook Personalizado Seguro

```typescript
import { useState, useCallback } from 'react';
import { useSafeFetch } from '@/lib/api';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchData } = useSafeFetch();
  
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/customers');
    
    if (result.success) {
      setCustomers(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  const createCustomer = useCallback(async (customerData: any) => {
    setLoading(true);
    setError(null);
    
    const result = await fetchData('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    
    if (result.success) {
      setCustomers(prev => [...prev, result.data]);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, [fetchData]);
  
  return {
    customers,
    loading,
    error,
    loadCustomers,
    createCustomer,
  };
}
```

### Refactorización de Código Inseguro

#### ❌ Antes (Inseguro)
```typescript
const response = await fetch('/api/customers');
const data = await response.json(); // ❌ Sin validación
```

#### ✅ Después (Seguro)
```typescript
const result = await safeFetch('/api/customers');
if (result.success) {
  const data = result.data;
} else {
  throw new Error(result.error);
}
```

## 🔧 Configuración

### Configuración Global

```typescript
// src/lib/api/config.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
  retries: 2,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

### Interceptores (Futuro)

```typescript
// Funcionalidad futura para interceptores
export function addRequestInterceptor(interceptor: (config: any) => any) {
  // Implementación futura
}

export function addResponseInterceptor(interceptor: (response: any) => any) {
  // Implementación futura
}
```

## 🧪 Testing

```typescript
import { safeFetch } from '@/lib/api';

// Mock de fetch para testing
global.fetch = jest.fn();

test('should handle network errors', async () => {
  (fetch as jest.Mock).mockRejectedValue(new TypeError('Network error'));
  
  const result = await safeFetch('/api/test');
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('Error de red');
});
```

## 📚 API Reference

### `safeFetch<T>(url: string, options?: SafeFetchOptions): Promise<SafeFetchResponse<T>>`

Función principal para realizar peticiones HTTP seguras.

**Parámetros:**
- `url`: URL de la petición
- `options`: Opciones de configuración (timeout, retries, headers, etc.)

**Retorna:**
```typescript
{
  data: T | null;
  error: string | null;
  success: boolean;
  status: number;
  statusText: string;
}
```

### `handleApiError(error: any): ApiError`

Normaliza errores de diferentes fuentes.

**Retorna:**
```typescript
{
  message: string;
  code: string;
  status?: number;
  details?: any;
}
```

## 🚨 Migración

Para migrar código existente:

1. **Reemplazar fetch directo**:
   ```typescript
   // Antes
   const response = await fetch('/api/endpoint');
   const data = await response.json();
   
   // Después
   const result = await safeFetch('/api/endpoint');
   if (result.success) {
     const data = result.data;
   }
   ```

2. **Actualizar hooks**:
   ```typescript
   // Antes
   const response = await fetch('/api/endpoint');
   if (!response.ok) throw new Error('HTTP error');
   const data = await response.json();
   
   // Después
   const { fetchData } = useSafeFetch();
   const result = await fetchData('/api/endpoint');
   ```

## 🤝 Contribución

Para agregar nuevas funcionalidades:

1. Crear tests para la nueva funcionalidad
2. Actualizar la documentación
3. Asegurar compatibilidad con TypeScript
4. Seguir los patrones existentes

## 📄 Licencia

Este módulo es parte del proyecto Eagles System.




















