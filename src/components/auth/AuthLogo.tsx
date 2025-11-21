'use client'

import Image from 'next/image'

interface AuthLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function AuthLogo({ size = 'lg', showText = true }: AuthLogoProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center mb-4">
        <Image
          src="/logo-icon.svg"
          alt="EAGLES Logo"
          width={80}
          height={80}
          className={sizeClasses[size]}
          priority
        />
      </div>
      {showText && (
        <>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">
            EAGLES
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de Gestión de Talleres
          </p>
        </>
      )}
    </div>
  )
}






