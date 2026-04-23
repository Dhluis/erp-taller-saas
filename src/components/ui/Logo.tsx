'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useSession } from '@/lib/context/SessionContext'

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
  const { companySettings } = useSession()
  
  const isSquare = size === 'sm';
  const defaultLogo = isSquare 
    ? "https://i.ibb.co/d4CNVSBS/conf-a-Drive-logo-con-11.png"
    : "https://i.ibb.co/5h083nG9/cmyk-confia-drive-Mesa-de-trabajo-1-copia-1.png";
    
  const logoUrl = companySettings?.logo_url || defaultLogo
  
  const imgWidth = isSquare ? 64 : 160;
  const imgHeight = isSquare ? 64 : 64;

  return (
    <div className={cn('flex items-center justify-center', sizeClasses[size], className)}>
      <Image
        src={logoUrl}
        alt={companySettings?.company_name || "Confia Drive Logo"}
        width={imgWidth}
        height={imgHeight}
        className="w-full h-auto object-contain"
        priority
      />
    </div>
  )
}

interface LogoWithTextProps extends LogoProps {
  companyName?: string
}

export function LogoWithText({ size = 'md', variant = 'default', className, companyName: propCompanyName }: LogoWithTextProps) {
  const { companySettings } = useSession()
  const companyName = propCompanyName || companySettings?.company_name || 'Confia Drive'
  
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
        <span className={cn('font-bold text-text-primary uppercase tracking-tight', textSizes[size])}>
          {companyName}
        </span>
        <span className={cn('text-[10px] text-text-secondary leading-none mt-0.5 font-medium tracking-wider uppercase opacity-70', size === 'sm' ? 'hidden' : 'block')}>
          {companySettings?.company_name ? 'Taller Automotriz' : 'Sistema de Gestión'}
        </span>
      </div>
    </div>
  )
}

