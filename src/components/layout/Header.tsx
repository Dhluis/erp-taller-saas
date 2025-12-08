'use client'

import { useState } from 'react'
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  ChevronDown,
  Menu
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { GlobalSearch } from '@/components/search/GlobalSearch'

interface HeaderProps {
  title?: string
  onMenuClick?: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const { colors } = useTheme()

  const notifications = [
    {
      id: 1,
      title: 'Stock bajo en Filtro de Aire',
      message: 'Solo quedan 2 unidades disponibles',
      time: '2 min',
      type: 'warning' as const,
    },
    {
      id: 2,
      title: 'Nueva orden completada',
      message: 'Orden #1234 ha sido completada',
      time: '15 min',
      type: 'success' as const,
    },
    {
      id: 3,
      title: 'Factura vencida',
      message: 'Factura #5678 está vencida',
      time: '1 hora',
      type: 'error' as const,
    },
  ]

  const unreadCount = notifications.length

  // Atajos de teclado para abrir búsqueda global
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsGlobalSearchOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg-secondary/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <h1 className="text-xl font-semibold text-text-primary">
              {title || 'Dashboard'}
            </h1>
          </div>

          {/* Center - Search (ahora funcional) */}
          <div className="flex-1 max-w-md mx-8">
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="w-full"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar órdenes, clientes, productos... (Ctrl+K)"
                  readOnly
                  className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-bg-tertiary/70 transition-colors"
                  onClick={() => setIsGlobalSearchOpen(true)}
                />
              </div>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-error text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-text-primary">Notificaciones</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b border-border hover:bg-bg-tertiary transition-colors cursor-pointer"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-success' :
                            notification.type === 'warning' ? 'bg-warning' :
                            notification.type === 'error' ? 'bg-error' : 'bg-info'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">
                              {notification.title}
                            </p>
                            <p className="text-sm text-text-secondary mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-border">
                    <button className="w-full text-sm text-primary hover:text-primary-dark transition-colors">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors">
              <Settings className="h-5 w-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:block text-sm font-medium">Admin</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-bg-secondary border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">Usuario Admin</p>
                    <p className="text-xs text-text-secondary">admin@eagles.com</p>
                  </div>
                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                      Perfil
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                      Configuración
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                      Ayuda
                    </button>
                  </div>
                  <div className="border-t border-border py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-error hover:bg-bg-tertiary transition-colors flex items-center space-x-2">
                      <LogOut className="h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
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
