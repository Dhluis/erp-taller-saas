/**
 * Tests básicos para fetch-utils
 * 
 * Este archivo contiene tests de ejemplo para las utilidades de fetch
 * Nota: Para ejecutar estos tests, necesitarás configurar Jest o Vitest
 */

import { safeFetch, handleApiError } from './fetch-utils';

// Mock de fetch para testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('safeFetch', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('should handle successful JSON response', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => 'application/json',
      },
      text: () => Promise.resolve(JSON.stringify(mockData)),
    });

    const result = await safeFetch('/api/test');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  test('should handle HTTP error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: () => 'application/json',
      },
      text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
    });

    const result = await safeFetch('/api/test');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('HTTP 404');
  });

  test('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

    const result = await safeFetch('/api/test');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Error de red');
  });

  test('should handle HTML responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => 'text/html',
      },
      text: () => Promise.resolve('<html><body>Error</body></html>'),
    });

    const result = await safeFetch('/api/test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Respuesta HTML inesperada');
  });

  test('should handle JSON parse errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => 'application/json',
      },
      text: () => Promise.resolve('invalid json'),
    });

    const result = await safeFetch('/api/test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Error al parsear JSON');
  });

  test('should handle timeouts', async () => {
    // Simular timeout
    mockFetch.mockImplementationOnce(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 100);
      })
    );

    const result = await safeFetch('/api/test', { timeout: 50 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout');
  });
});

describe('handleApiError', () => {
  test('should handle Supabase errors', () => {
    const error = {
      code: 'PGRST116',
      message: 'The result contains 0 rows',
      details: 'Some details',
    };

    const result = handleApiError(error);

    expect(result.code).toBe('PGRST116');
    expect(result.message).toBe('The result contains 0 rows');
    expect(result.details).toBe('Some details');
  });

  test('should handle HTTP errors', () => {
    const error = {
      status: 404,
      message: 'Not Found',
      statusText: 'Not Found',
    };

    const result = handleApiError(error);

    expect(result.code).toBe('HTTP_404');
    expect(result.message).toBe('Not Found');
    expect(result.status).toBe(404);
  });

  test('should handle network errors', () => {
    const error = new TypeError('Network error');

    const result = handleApiError(error);

    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.message).toBe('Error de conexión de red');
  });

  test('should handle timeout errors', () => {
    const error = new Error('AbortError');
    error.name = 'AbortError';

    const result = handleApiError(error);

    expect(result.code).toBe('TIMEOUT_ERROR');
    expect(result.message).toBe('Timeout de conexión');
  });

  test('should handle JSON parse errors', () => {
    const error = new SyntaxError('Unexpected token');

    const result = handleApiError(error);

    expect(result.code).toBe('JSON_PARSE_ERROR');
    expect(result.message).toBe('Error al procesar respuesta del servidor');
  });

  test('should handle unknown errors', () => {
    const error = { someProperty: 'value' };

    const result = handleApiError(error);

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Error desconocido');
  });
});

// Tests de integración (requieren servidor de prueba)
describe('Integration Tests', () => {
  test('should work with real API endpoints', async () => {
    // Este test requeriría un servidor de prueba real
    // Por ahora, solo verificamos que la función no lance errores
    const result = await safeFetch('/api/customers');
    
    // El resultado puede ser exitoso o fallar, pero no debe lanzar excepciones
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('status');
  });
});

// Helper para tests
export function createMockResponse(data: any, options: any = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
    headers: {
      get: (name: string) => options.headers?.[name] || 'application/json',
    },
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

// Helper para crear errores de red
export function createNetworkError() {
  return new TypeError('Failed to fetch');
}

// Helper para crear errores de timeout
export function createTimeoutError() {
  const error = new Error('Request timeout');
  error.name = 'AbortError';
  return error;
}


















