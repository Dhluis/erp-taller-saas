'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'white' | 'dark'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

export function Logo({ size = 'md', variant = 'default', className }: LogoProps) {
  const getVariantColors = () => {
    switch (variant) {
      case 'white':
        return {
          circle: '#FFFFFF',
          text: '#0A0E1A',
        }
      case 'dark':
        return {
          circle: '#0A0E1A',
          text: '#00D9FF',
        }
      default:
        return {
          circle: '#00D9FF',
          text: '#0A0E1A',
        }
    }
  }

  const colors = getVariantColors()

  return (
    <div className={cn('flex items-center justify-center', sizeClasses[size], className)}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 100"
        className="w-full h-full"
      >
        <circle cx="50" cy="50" r="45" fill={colors.circle}/>
        <text 
          x="50" 
          y="65" 
          fontSize="50" 
          textAnchor="middle" 
          fill={colors.text} 
          fontWeight="bold"
          fontFamily="Inter, sans-serif"
        >
          E
        </text>
      </svg>
    </div>
  )
}

export function LogoWithText({ size = 'md', variant = 'default', className }: LogoProps) {
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Logo size={size} variant={variant} />
      <div className="flex flex-col">
        <span className={cn('font-bold text-text-primary', textSizes[size])}>
          EAGLES
        </span>
        <span className={cn('text-xs text-text-secondary', size === 'sm' ? 'text-xs' : 'text-xs')}>
          ERP Taller SaaS
        </span>
      </div>
    </div>
  )
}

