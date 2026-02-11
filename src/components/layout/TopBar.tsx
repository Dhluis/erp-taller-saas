'use client'

import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import ModernIcons from '@/components/icons/ModernIcons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LogoWithText } from '@/components/ui/Logo'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUserProfile } from '@/hooks/use-user-profile'
import { usePermissions } from '@/hooks/usePermissions'

interface TopBarProps {
  onMenuClick?: () => void
  title?: string
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const pathname = usePathname()
  const { profile, getInitials } = useUserProfile()
  const permissions = usePermissions()
  const isMechanic = permissions.isMechanic
  
  const isCitasActive = pathname?.startsWith('/citas')
  const isClientesActive = pathname?.startsWith('/clientes')
  const isOrdenesActive = pathname?.startsWith('/ordenes')
  const isReportesActive = pathname?.startsWith('/reportes')
  const isWhatsAppActive = pathname?.startsWith('/dashboard/whatsapp')
  
  // Datos del usuario
  const userName = profile?.full_name || 'Usuario'
  const userEmail = profile?.email || 'Cargando...'
  const userInitials = profile ? getInitials(profile.full_name) : 'U'

  // Atajos de teclado para abrir búsqueda global (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsGlobalSearchOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
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
          
          {/* ✅ NAVEGACIÓN SIMPLIFICADA PARA MECÁNICOS - Solo Órdenes */}
          {isMechanic ? (
            <Link href="/ordenes/kanban">
              <Button
                variant={isOrdenesActive ? "default" : "outline"}
                className={cn(
                  "transition-all duration-200 gap-2",
                  "min-h-[44px] min-w-[44px] md:min-w-auto", // ✅ Mobile-first: botones táctiles grandes
                  isOrdenesActive 
                    ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                    : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                )}
              >
                <ModernIcons.Ordenes size={18} />
                <span className="text-sm font-medium hidden sm:inline">Mis Órdenes</span>
              </Button>
            </Link>
          ) : (
            <>
              {/* Botones de navegación - movidos desde sidebar */}
              <Link href="/citas">
                <Button
                  variant={isCitasActive ? "default" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isCitasActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Citas size={16} />
                  <span className="text-sm font-medium">Citas</span>
                </Button>
              </Link>
              
              <Link href="/clientes">
                <Button
                  variant={isClientesActive ? "default" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isClientesActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Clientes size={16} />
                  <span className="text-sm font-medium">Clientes</span>
                </Button>
              </Link>
              
              <Link href="/ordenes">
                <Button
                  variant={isOrdenesActive ? "default" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isOrdenesActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Ordenes size={16} />
                  <span className="text-sm font-medium">Órdenes</span>
                </Button>
              </Link>
              
              <Link href="/reportes">
                <Button
                  variant={isReportesActive ? "default" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isReportesActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Reportes size={16} />
                  <span className="text-sm font-medium">Reportes</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/whatsapp">
                <Button
                  variant={isWhatsAppActive ? "default" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isWhatsAppActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.WhatsApp size={16} />
                  <span className="text-sm font-medium">WhatsApp</span>
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Global Search - Ahora funcional */}
          <button
            onClick={() => setIsGlobalSearchOpen(true)}
            className="hidden md:flex items-center space-x-2 px-4 py-2 bg-bg-tertiary border border-border rounded-lg hover:bg-bg-tertiary/70 transition-colors cursor-pointer group"
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-text-secondary group-hover:text-text-primary" />
            <span className="text-sm text-text-muted group-hover:text-text-secondary">
              Buscar...
            </span>
            <kbd className="hidden lg:inline-block px-2 py-1 text-xs font-semibold text-text-muted bg-bg-primary border border-border rounded">
              Ctrl+K
            </kbd>
          </button>

          {/* Mobile Search Button */}
          <button
            onClick={() => setIsGlobalSearchOpen(true)}
            className="md:hidden p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <MagnifyingGlassIcon className="w-6 h-6 text-text-secondary" />
          </button>
          
          {/* Notifications */}
          <div>
            <NotificationBell />
          </div>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3 pl-4 border-l border-border">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-bg-primary font-bold text-sm">
              {userInitials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-text-primary truncate max-w-[150px]">{userName}</p>
              <p className="text-xs text-text-secondary truncate max-w-[150px]">{userEmail}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch 
        open={isGlobalSearchOpen} 
        onOpenChange={setIsGlobalSearchOpen}
      />
    </>
  )
}
