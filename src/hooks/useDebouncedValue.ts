/**
 * useDebouncedValue Hook
 * Eagles ERP - Debounce para inputs de búsqueda
 */

import { useState, useEffect } from 'react'

/**
 * Hook que debouncea un valor
 * Útil para campos de búsqueda para no hacer request en cada keystroke
 * 
 * @param value - El valor a debouncer
 * @param delay - Delay en milisegundos (default: 500ms)
 * @returns El valor debouncedado
 * 
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebouncedValue(search, 500)
 * 
 * // Usar debouncedSearch en useEffect para fetch
 * useEffect(() => {
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Crear timer
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: cancelar timer si value cambia antes del delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

