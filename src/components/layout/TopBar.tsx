'use client'

import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { LogoWithText } from '@/components/ui/Logo'
import { NotificationBell } from '@/components/layout/NotificationBell'

interface TopBarProps {
  onMenuClick?: () => void
  title?: string
}

export function TopBar({ onMenuClick, title = 'EAGLES - ERP Taller SaaS' }: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <Bars3Icon className="w-6 h-6 text-text-primary" />
          </button>
        )}
        
        {title ? (
          <h2 className="text-xl font-semibold text-text-primary">
            {title}
          </h2>
        ) : (
          <LogoWithText size="sm" />
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <MagnifyingGlassIcon className="w-6 h-6 text-text-secondary" />
          </button>
          
          {isSearchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border rounded-lg shadow-lg z-50">
              <div className="p-4">
                <input
                  type="text"
                  placeholder="Buscar clientes, órdenes, productos..."
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary placeholder-text-muted focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Notifications */}
        <NotificationBell />
        
        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-4 border-l border-border">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-bg-primary font-bold">
            AP
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-text-primary">Admin</p>
            <p className="text-xs text-text-secondary">admin@eagles.com</p>
          </div>
        </div>
      </div>
    </header>
  )
}
