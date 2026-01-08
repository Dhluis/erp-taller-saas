/**
 * Logger utility que desactiva logs en producción
 * Reduce overhead significativo en producción
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    // Siempre mostrar errores, pero con menos información en producción
    if (isDevelopment) {
      console.error(...args)
    } else {
      // En producción, solo mostrar mensaje sin stack traces
      const messages = args.filter(arg => typeof arg === 'string')
      if (messages.length > 0) {
        console.error(messages[0])
      }
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },
}

