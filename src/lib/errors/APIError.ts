// ✅ CORRECTO: Clase de error personalizada
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
    
    // Mantener el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  // Método para convertir a JSON
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }

  // Método para logging
  toLog() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack
    };
  }
}

// Errores específicos del sistema
export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends APIError {
  constructor(message: string, originalError?: any) {
    super(message, 'DATABASE_ERROR', 500, { originalError });
    this.name = 'DatabaseError';
  }
}

export class SupabaseError extends APIError {
  constructor(message: string, supabaseError: any) {
    super(message, 'SUPABASE_ERROR', 500, {
      code: supabaseError.code,
      details: supabaseError.details,
      hint: supabaseError.hint
    });
    this.name = 'SupabaseError';
  }
}

// Función helper para manejar errores de Supabase
export function handleSupabaseError(error: any, context: string): APIError {
  console.error(`Supabase error in ${context}:`, error);
  
  // Errores específicos de Supabase
  if (error.code === '23505') {
    return new ConflictError('El registro ya existe', { field: error.detail });
  }
  
  if (error.code === '23503') {
    return new ValidationError('Referencia a registro inexistente', { constraint: error.constraint });
  }
  
  if (error.code === '22P02') {
    return new ValidationError('Formato de UUID inválido', { value: error.hint });
  }
  
  if (error.code === '23502') {
    return new ValidationError('Campo requerido faltante', { column: error.column });
  }
  
  // Error genérico de Supabase
  return new SupabaseError(`Error de base de datos en ${context}`, error);
}

// Función helper para manejar errores de API
export function handleAPIError(error: unknown, context: string): APIError {
  if (error instanceof APIError) {
    return error;
  }
  
  if (error instanceof Error) {
    console.error(`Unexpected error in ${context}:`, error);
    return new APIError(
      `Error interno en ${context}: ${error.message}`,
      'INTERNAL_ERROR',
      500,
      { originalError: error.message }
    );
  }
  
  console.error(`Unknown error in ${context}:`, error);
  return new APIError(
    `Error desconocido en ${context}`,
    'UNKNOWN_ERROR',
    500,
    { originalError: error }
  );
}

// Función para crear respuestas de error consistentes
export function createErrorResponse(error: APIError) {
  return {
    success: false,
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details
  };
}














