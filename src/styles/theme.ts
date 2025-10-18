/**
 * =====================================================
 * SISTEMA DE TEMAS PARA ERP EAGLES
 * =====================================================
 * Tema oscuro moderno inspirado en las capturas
 * con colores cyan/turquesa y fondos oscuros
 */

export const theme = {
  colors: {
    // Colores principales
    primary: {
      DEFAULT: '#00D9FF', // Cyan/Turquesa brillante
      light: '#33E1FF',
      dark: '#00B8D9',
      50: '#E6FDFF',
      100: '#CCFBFF',
      200: '#99F7FF',
      300: '#66F3FF',
      400: '#33E1FF',
      500: '#00D9FF',
      600: '#00B8D9',
      700: '#0097B3',
      800: '#00768D',
      900: '#005566',
    },
    
    // Backgrounds
    bg: {
      primary: '#0A0E1A',    // Fondo principal (casi negro)
      secondary: '#151923',  // Fondo de cards
      tertiary: '#1E2430',   // Fondo de inputs/hover
      quaternary: '#252B3A', // Fondo de elementos secundarios
      overlay: 'rgba(10, 14, 26, 0.8)', // Overlay para modales
    },
    
    // Textos
    text: {
      primary: '#FFFFFF',     // Texto principal
      secondary: '#9CA3AF',   // Texto secundario
      muted: '#6B7280',       // Texto deshabilitado
      inverse: '#0A0E1A',     // Texto sobre fondos claros
    },
    
    // Estados
    success: {
      DEFAULT: '#10B981',
      light: '#34D399',
      dark: '#059669',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    warning: {
      DEFAULT: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    error: {
      DEFAULT: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    info: {
      DEFAULT: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    
    // Bordes
    border: {
      DEFAULT: '#2D3748',
      light: '#374151',
      dark: '#1F2937',
      primary: '#00D9FF',
    },
    
    // Gradientes
    gradients: {
      primary: 'linear-gradient(135deg, #00D9FF 0%, #00B8D9 100%)',
      secondary: 'linear-gradient(135deg, #151923 0%, #1E2430 100%)',
      overlay: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 184, 217, 0.1) 100%)',
    },
    
    // Sombras
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      md: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      lg: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      xl: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      primary: '0 4px 14px 0 rgba(0, 217, 255, 0.3)',
    }
  },
  
  // Espaciado
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Tipografía
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    }
  },
  
  // Bordes redondeados
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },
  
  // Transiciones
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  }
}

// Tipos TypeScript para el tema
export type Theme = typeof theme
export type ThemeColors = typeof theme.colors
export type ThemeSpacing = typeof theme.spacing
export type ThemeTypography = typeof theme.typography

// Utilidades para usar el tema
export const getColor = (path: string) => {
  const keys = path.split('.')
  let value: any = theme.colors
  
  for (const key of keys) {
    value = value?.[key]
  }
  
  return value || path
}

export const getSpacing = (size: keyof typeof theme.spacing) => {
  return theme.spacing[size]
}

export const getTypography = (property: keyof typeof theme.typography) => {
  return theme.typography[property]
}

// Clases CSS personalizadas para el tema
export const themeClasses = {
  // Backgrounds
  bgPrimary: 'bg-[#0A0E1A]',
  bgSecondary: 'bg-[#151923]',
  bgTertiary: 'bg-[#1E2430]',
  
  // Textos
  textPrimary: 'text-white',
  textSecondary: 'text-[#9CA3AF]',
  textMuted: 'text-[#6B7280]',
  
  // Bordes
  borderDefault: 'border-[#2D3748]',
  borderLight: 'border-[#374151]',
  borderPrimary: 'border-[#00D9FF]',
  
  // Estados
  success: 'text-[#10B981]',
  warning: 'text-[#F59E0B]',
  error: 'text-[#EF4444]',
  info: 'text-[#3B82F6]',
  
  // Sombras
  shadowPrimary: 'shadow-[0_4px_14px_0_rgba(0,217,255,0.3)]',
  shadowDark: 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]',
}

export default theme

