/**
 * Utilitario para manejo seguro de errores en API routes.
 * En producción devuelve mensajes genéricos al cliente.
 * En desarrollo devuelve el mensaje real para facilitar debugging.
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Retorna un mensaje de error seguro para incluir en la respuesta al cliente.
 * Nunca expone stack traces, rutas internas ni mensajes de DB en producción.
 */
export function safeError(
  err: unknown,
  fallback = 'Error interno del servidor'
): string {
  if (isDev) {
    if (err instanceof Error) return err.message
    if (typeof err === 'string') return err
    return fallback
  }
  return fallback
}

/**
 * Loguea el error con contexto y retorna el mensaje seguro.
 * Uso recomendado en bloques catch de API routes.
 *
 * @example
 * } catch (err) {
 *   const msg = logAndSafeError(err, 'GET /api/customers')
 *   return NextResponse.json({ success: false, error: msg }, { status: 500 })
 * }
 */
export function logAndSafeError(
  err: unknown,
  context: string,
  fallback = 'Error interno del servidor'
): string {
  console.error(`[${context}]`, err)
  return safeError(err, fallback)
}
