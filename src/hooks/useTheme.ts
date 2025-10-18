import { useCallback } from 'react'
import { theme, type Theme, type ThemeColors } from '@/styles/theme'

/**
 * =====================================================
 * HOOK PERSONALIZADO PARA EL TEMA EAGLES
 * =====================================================
 * Hook para acceder y manipular el tema del ERP
 */

export interface UseThemeReturn {
  theme: Theme
  colors: ThemeColors
  getColor: (path: string) => string
  getSpacing: (size: keyof typeof theme.spacing) => string
  getTypography: (property: keyof typeof theme.typography) => any
  isDark: boolean
  toggleTheme: () => void
}

export function useTheme(): UseThemeReturn {
  const getColor = useCallback((path: string): string => {
    const keys = path.split('.')
    let value: any = theme.colors
    
    for (const key of keys) {
      value = value?.[key]
    }
    
    return value || path
  }, [])

  const getSpacing = useCallback((size: keyof typeof theme.spacing): string => {
    return theme.spacing[size]
  }, [])

  const getTypography = useCallback((property: keyof typeof theme.typography) => {
    return theme.typography[property]
  }, [])

  const isDark = true // Siempre tema oscuro para EAGLES

  const toggleTheme = useCallback(() => {
    // Para futuras implementaciones de tema claro/oscuro
    console.log('Toggle theme not implemented yet - EAGLES uses dark theme only')
  }, [])

  return {
    theme,
    colors: theme.colors,
    getColor,
    getSpacing,
    getTypography,
    isDark,
    toggleTheme,
  }
}

/**
 * Hook para obtener colores específicos del tema
 */
export function useColors() {
  return theme.colors
}

/**
 * Hook para obtener espaciado del tema
 */
export function useSpacing() {
  return theme.spacing
}

/**
 * Hook para obtener tipografía del tema
 */
export function useTypography() {
  return theme.typography
}

/**
 * Hook para obtener clases CSS del tema
 */
export function useThemeClasses() {
  return {
    // Backgrounds
    bgPrimary: 'bg-bg-primary',
    bgSecondary: 'bg-bg-secondary',
    bgTertiary: 'bg-bg-tertiary',
    
    // Textos
    textPrimary: 'text-text-primary',
    textSecondary: 'text-text-secondary',
    textMuted: 'text-text-muted',
    
    // Bordes
    borderDefault: 'border-border',
    borderLight: 'border-border-light',
    borderPrimary: 'border-primary',
    
    // Estados
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
    
    // Sombras
    shadowPrimary: 'shadow-primary',
    shadowDark: 'shadow-md',
    
    // Gradientes
    gradientPrimary: 'bg-gradient-primary',
    gradientSecondary: 'bg-gradient-secondary',
    
    // Efectos
    glass: 'glass',
    glow: 'glow',
    textGradient: 'text-gradient',
  }
}

export default useTheme

