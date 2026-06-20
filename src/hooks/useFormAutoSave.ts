'use client'

import { useEffect, useCallback, useRef } from 'react'

const DEBOUNCE_MS = 2000
const INTERVAL_MS = 30000
const EXPIRY_MS = 24 * 60 * 60 * 1000

interface SavedState<T> {
  data: T
  savedAt: string
}

function hasContent(data: unknown): boolean {
  if (typeof data === 'string') return data.trim().length > 0
  if (typeof data === 'boolean') return data
  if (typeof data === 'number') return data !== 0
  if (Array.isArray(data)) return data.length > 0
  if (data !== null && typeof data === 'object') {
    return Object.values(data as object).some(hasContent)
  }
  return false
}

export function useFormAutoSave<T extends object>(
  key: string,
  values: T,
  enabled = true
) {
  const storageKey = `eagles_form_${key}`
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const valuesRef = useRef(values)

  useEffect(() => { valuesRef.current = values }, [values])

  const save = useCallback((data: T) => {
    if (!hasContent(data)) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      } satisfies SavedState<T>))
    } catch {}
  }, [storageKey])

  const clear = useCallback(() => {
    try { localStorage.removeItem(storageKey) } catch {}
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [storageKey])

  const getSaved = useCallback((): SavedState<T> | null => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as SavedState<T>
      if (Date.now() - new Date(parsed.savedAt).getTime() > EXPIRY_MS) {
        localStorage.removeItem(storageKey)
        return null
      }
      return parsed
    } catch {
      return null
    }
  }, [storageKey])

  // Debounced save on value change
  useEffect(() => {
    if (!enabled) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(values), DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [values, enabled, save])

  // Interval force-save
  useEffect(() => {
    if (!enabled) return
    intervalRef.current = setInterval(() => save(valuesRef.current), INTERVAL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [enabled, save])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return { getSaved, clear, save }
}

export function timeSince(isoDate: string): string {
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  return hrs === 1 ? 'hace 1 hora' : `hace ${hrs} horas`
}
