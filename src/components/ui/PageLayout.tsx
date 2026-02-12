/**
 * Componente PageLayout Reutilizable
 * Layout de página con header, sidebar y contenido
 */

"use client"

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Settings, 
  Bell, 
  Search,
  ChevronDown,
  User,
  LogOut,
  Moon,
  Sun
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavigationItem {
  label: string
  href: string
  icon?: ReactNode
  badge?: string | number
  children?: NavigationItem[]
  active?: boolean
}

export interface UserMenuProps {
  name: string
  email: string
  avatar?: string
  onProfile?: () => void
  onSettings?: () => void
  onLogout?: () => void
}

export interface PageLayoutProps {
  title: string
  description?: string
  children: ReactNode
  navigation?: NavigationItem[]
  user?: UserMenuProps
  breadcrumbs?: { label: string; href?: string }[]
  actions?: ReactNode
  sidebar?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  sidebarClassName?: string
  headerClassName?: string
  footerClassName?: string
  showSidebar?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showBreadcrumbs?: boolean
  showUserMenu?: boolean
  showNotifications?: boolean
  showSearch?: boolean
  showThemeToggle?: boolean
  theme?: 'light' | 'dark'
  onThemeChange?: (theme: 'light' | 'dark') => void
  onSearch?: (term: string) => void
  onNotificationClick?: () => void
  loading?: boolean
  error?: string | null
}

export function PageLayout({
  title,
  description,
  children,
  navigation = [],
  user,
  breadcrumbs = [],
  actions,
  sidebar,
  header,
  footer,
  className = '',
  contentClassName = '',
  sidebarClassName = '',
  headerClassName = '',
  footerClassName = '',
  showSidebar = true,
  showHeader = true,
  showFooter = true,
  showBreadcrumbs = true,
  showUserMenu = true,
  showNotifications = true,
  showSearch = true,
  showThemeToggle = true,
  theme = 'light',
  onThemeChange,
  onSearch,
  onNotificationClick,
  loading = false,
  error = null
}: PageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    onSearch?.(term)
  }
  
  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    onThemeChange?.(newTheme)
  }
  
  const renderSidebar = () => {
    if (!showSidebar) return null
    
    return (
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:inset-0',
        sidebarClassName
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Eagles System</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="mt-4 px-4">
          <ul className="space-y-2">
            {navigation.map((item, index) => (
              <li key={index}>
                <a
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        {sidebar}
      </div>
    )
  }
  
  const renderHeader = () => {
    if (!showHeader) return null
    
    return (
      <header className={cn(
        'bg-white border-b border-gray-200 px-4 py-3',
        headerClassName
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {showNotifications && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNotificationClick}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
            )}
            
            {showThemeToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleThemeToggle}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            )}
            
            {showUserMenu && user && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block">{user.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                    <button
                      onClick={user.onProfile}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Perfil
                    </button>
                    <button
                      onClick={user.onSettings}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Configuración
                    </button>
                    <button
                      onClick={user.onLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {actions}
          </div>
        </div>
        
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mt-2">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-gray-900">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-gray-900">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        
        {header}
      </header>
    )
  }
  
  const renderFooter = () => {
    if (!showFooter) return null
    
    return (
      <footer className={cn(
        'bg-white border-t border-gray-200 px-4 py-3',
        footerClassName
      )}>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>&copy; 2024 Eagles System. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-900">Política de privacidad</a>
            <a href="#" className="hover:text-gray-900">Términos de servicio</a>
          </div>
        </div>
        {footer}
      </footer>
    )
  }
  
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Sidebar */}
      {renderSidebar()}
      
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header */}
        {renderHeader()}
        
        {/* Contenido */}
        <main className={cn('min-h-screen', contentClassName)}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Error</h3>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
        
        {/* Footer */}
        {renderFooter()}
      </div>
    </div>
  )
}

export default PageLayout







