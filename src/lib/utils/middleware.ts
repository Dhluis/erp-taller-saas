// ✅ CORRECTO: Utilidades para middleware

import { NextRequest, NextResponse } from 'next/server';
import { API_CONSTANTS } from '@/lib/constants';

/**
 * Utilidades para middleware de autenticación
 */
export const AuthMiddlewareUtils = {
  /**
   * Verifica si la ruta requiere autenticación
   */
  requiresAuth: (pathname: string): boolean => {
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/health',
      '/api/status'
    ];
    
    return !publicRoutes.some(route => pathname.startsWith(route));
  },

  /**
   * Verifica si la ruta es de API
   */
  isApiRoute: (pathname: string): boolean => {
    return pathname.startsWith('/api');
  },

  /**
   * Verifica si la ruta es de dashboard
   */
  isDashboardRoute: (pathname: string): boolean => {
    return pathname.startsWith('/dashboard') || 
           pathname.startsWith('/clientes') ||
           pathname.startsWith('/vehiculos') ||
           pathname.startsWith('/inventario') ||
           pathname.startsWith('/ordenes') ||
           pathname.startsWith('/cotizaciones') ||
           pathname.startsWith('/facturas') ||
           pathname.startsWith('/garantias') ||
           pathname.startsWith('/usuarios') ||
           pathname.startsWith('/configuracion') ||
           pathname.startsWith('/reportes');
  },

  /**
   * Obtiene el nivel de acceso requerido para la ruta
   */
  getRequiredAccessLevel: (pathname: string): number => {
    // Rutas de solo lectura
    if (pathname.startsWith('/api/reports') || pathname.startsWith('/reportes')) {
      return 1; // READ_ONLY
    }
    
    // Rutas de administración
    if (pathname.startsWith('/api/users') || pathname.startsWith('/usuarios') ||
        pathname.startsWith('/api/settings') || pathname.startsWith('/configuracion')) {
      return 5; // ADMIN
    }
    
    // Rutas estándar
    return 3; // STANDARD
  },

  /**
   * Crea una respuesta de error de autenticación
   */
  createAuthErrorResponse: (message: string = 'No autenticado'): NextResponse => {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'UNAUTHORIZED',
        statusCode: 401
      },
      { status: 401 }
    );
  },

  /**
   * Crea una respuesta de error de autorización
   */
  createForbiddenResponse: (message: string = 'Acceso denegado'): NextResponse => {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'FORBIDDEN',
        statusCode: 403
      },
      { status: 403 }
    );
  },

  /**
   * Crea una respuesta de error interno
   */
  createInternalErrorResponse: (message: string = 'Error interno del servidor'): NextResponse => {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'INTERNAL_ERROR',
        statusCode: 500
      },
      { status: 500 }
    );
  }
};

/**
 * Utilidades para headers de middleware
 */
export const HeaderUtils = {
  /**
   * Agrega headers de usuario a la respuesta
   */
  addUserHeaders: (response: NextResponse, user: any): NextResponse => {
    if (user) {
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-user-email', user.email || '');
      response.headers.set('x-user-role', user.role || 'user');
    }
    return response;
  },

  /**
   * Agrega headers de organización a la respuesta
   */
  addOrganizationHeaders: (response: NextResponse, organizationId: string): NextResponse => {
    response.headers.set('x-organization-id', organizationId);
    return response;
  },

  /**
   * Agrega headers de request ID para tracking
   */
  addRequestId: (response: NextResponse, requestId: string): NextResponse => {
    response.headers.set('x-request-id', requestId);
    return response;
  },

  /**
   * Agrega headers de CORS
   */
  addCorsHeaders: (response: NextResponse): NextResponse => {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }
};

/**
 * Utilidades para logging de middleware
 */
export const LoggingUtils = {
  /**
   * Log de request
   */
  logRequest: (request: NextRequest, user?: any): void => {
    console.log(`[MIDDLEWARE] ${request.method} ${request.nextUrl.pathname}`, {
      user: user?.id,
      email: user?.email,
      ip: request.ip,
      userAgent: request.headers.get('user-agent')
    });
  },

  /**
   * Log de error
   */
  logError: (error: any, context: string): void => {
    console.error(`[MIDDLEWARE ERROR] ${context}:`, error);
  },

  /**
   * Log de autenticación
   */
  logAuth: (success: boolean, user?: any, error?: any): void => {
    if (success) {
      console.log(`[AUTH SUCCESS] User: ${user?.id} (${user?.email})`);
    } else {
      console.error(`[AUTH FAILED]`, error);
    }
  }
};

/**
 * Utilidades para validación de middleware
 */
export const ValidationUtils = {
  /**
   * Valida el token de autorización
   */
  validateAuthToken: (authHeader: string | null): boolean => {
    if (!authHeader) return false;
    if (!authHeader.startsWith('Bearer ')) return false;
    return authHeader.length > 7; // "Bearer " + token
  },

  /**
   * Valida el formato de la ruta
   */
  validateRoute: (pathname: string): boolean => {
    // Verificar que no contenga caracteres peligrosos
    const dangerousChars = ['..', '//', '\\', '<', '>', '&', '"', "'"];
    return !dangerousChars.some(char => pathname.includes(char));
  },

  /**
   * Valida el método HTTP
   */
  validateMethod: (method: string): boolean => {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    return allowedMethods.includes(method);
  }
};

/**
 * Utilidades para rate limiting
 */
export const RateLimitUtils = {
  /**
   * Verifica si la IP está en la lista negra
   */
  isBlacklisted: (ip: string): boolean => {
    // Implementar lógica de blacklist
    return false;
  },

  /**
   * Verifica si la IP ha excedido el límite de requests
   */
  hasExceededLimit: (ip: string, limit: number = 100): boolean => {
    // Implementar lógica de rate limiting
    return false;
  },

  /**
   * Obtiene el límite de requests para la ruta
   */
  getRateLimit: (pathname: string): number => {
    if (pathname.startsWith('/api/auth')) return 10; // Límite bajo para auth
    if (pathname.startsWith('/api/upload')) return 5; // Límite muy bajo para uploads
    return 100; // Límite estándar
  }
};

/**
 * Utilidades para CORS
 */
export const CorsUtils = {
  /**
   * Verifica si el origen está permitido
   */
  isOriginAllowed: (origin: string | null): boolean => {
    if (!origin) return true; // Permitir requests sin origen (ej: Postman)
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com'
    ];
    
    return allowedOrigins.includes(origin);
  },

  /**
   * Maneja preflight requests
   */
  handlePreflight: (request: NextRequest): NextResponse | null => {
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      CorsUtils.addCorsHeaders(response);
      return response;
    }
    return null;
  },

  /**
   * Agrega headers de CORS
   */
  addCorsHeaders: (response: NextResponse): void => {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
};




















