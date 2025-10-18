/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colores principales del tema EAGLES
        primary: {
          DEFAULT: '#00D9FF',
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
          primary: '#0A0E1A',
          secondary: '#151923',
          tertiary: '#1E2430',
          quaternary: '#252B3A',
        },
        
        // Textos
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          inverse: '#0A0E1A',
        },
        
        // Estados
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
        },
        
        // Bordes
        border: {
          DEFAULT: '#2D3748',
          light: '#374151',
          dark: '#1F2937',
          primary: '#00D9FF',
        }
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        xl: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        primary: '0 4px 14px 0 rgba(0, 217, 255, 0.3)',
      },
      
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00D9FF 0%, #00B8D9 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #151923 0%, #1E2430 100%)',
        'gradient-overlay': 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 184, 217, 0.1) 100%)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-primary': 'pulsePrimary 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulsePrimary: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 217, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}