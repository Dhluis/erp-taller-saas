"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarUserProfile } from "@/components/sidebar-user-profile"
import ModernIcons from '@/components/icons/ModernIcons'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  LogOut,
  CreditCard
} from "lucide-react"
import { useSidebar } from '@/contexts/SidebarContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/lib/context/SessionContext'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { isCollapsed, toggleCollapse } = useSidebar()
  const permissions = usePermissions()
  const { isLoading: sessionLoading } = useSession()
  // Logo actualizado - EAGLES SYSTEM
  const logoUrl = "/eagles-logo-new.png"

  // Inicializar secciones expandidas solo si la ruta actual está dentro de una sección
  useEffect(() => {
    const sections = ['inventarios', 'ingresos', 'compras', 'reportes', 'configuraciones']
    const activeSections: string[] = []
    
    // Verificar si la ruta actual está dentro de alguna sección
    sections.forEach(section => {
      const sectionRoutes: Record<string, string[]> = {
        'inventarios': ['/inventarios', '/inventarios/productos', '/inventarios/categorias', '/inventarios/movimientos'],
        'ingresos': ['/ingresos', '/ingresos/facturacion', '/cobros', '/ingresos/reportes'],
        'compras': ['/compras', '/compras/proveedores', '/compras/pagos'],
        'reportes': ['/reportes', '/reportes/ventas', '/reportes/inventario', '/reportes/financieros'],
        'configuraciones': ['/configuraciones', '/configuraciones/empresa', '/configuraciones/usuarios', '/configuraciones/sistema', '/settings/billing', '/mensajeria', '/mensajeria/email', '/mensajeria/whatsapp', '/perfil']
      }
      
      if (sectionRoutes[section]?.some(route => pathname.startsWith(route))) {
        activeSections.push(section)
      }
    })
    
    // Solo expandir la sección activa si existe
    if (activeSections.length > 0) {
      setExpandedSections(activeSections)
    }
  }, [pathname])

  // Verificar si una sección debe estar expandida
  const shouldExpandSection = (sectionKey: string) => {
    return expandedSections.includes(sectionKey)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  // Si está cargando o es admin, mostrar más opciones por defecto
  const showAllForAdmin = !sessionLoading && permissions.isAdmin
  const isMechanic = permissions.isMechanic
  
  // ✅ NAVEGACIÓN SIMPLIFICADA PARA MECÁNICOS (mobile-first)
  // Mecánicos solo ven: Dashboard, Kanban, Mi Perfil
  const mainNavItems = isMechanic ? [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: () => <ModernIcons.Dashboard size={20} />,
      badge: null,
      visible: true
    },
    { 
      href: "/ordenes/kanban", 
      label: "Mis Órdenes", 
      icon: () => <ModernIcons.Ordenes size={20} />,
      badge: null,
      visible: true
    }
  ] : [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: () => <ModernIcons.Dashboard size={20} />,
      badge: null,
      // Todos pueden ver dashboard
      visible: true
    },
    // Clientes movido al TopBar
    { 
      href: "/proveedores", 
      label: "Proveedores", 
      icon: () => <ModernIcons.Clientes size={20} />,
      badge: null,
      // Admin siempre puede ver, otros según permisos
      visible: showAllForAdmin || permissions.canManageSuppliers()
    },
    { 
      href: "/vehiculos", 
      label: "Vehículos", 
      icon: () => <ModernIcons.Vehiculos size={20} />,
      badge: null,
      // Admin siempre puede ver, otros según permisos
      visible: showAllForAdmin || permissions.canRead('vehicles')
    },
    // Órdenes movido al TopBar
    {
      href: "/cotizaciones",
      label: "Cotizaciones",
      icon: () => <ModernIcons.Cotizaciones size={20} />,
      badge: null,
      // Admin siempre puede ver, otros según permisos
      visible: showAllForAdmin || permissions.canRead('quotations')
    }
    // WhatsApp movido al TopBar
  ].filter(item => item.visible)

  // ✅ OPTIMIZACIÓN: Memoizar collapsibleSections para evitar recrear en cada render
  const collapsibleSections = useMemo(() => {
    if (isMechanic) return []
    
    return [
    {
      key: 'inventarios',
      label: 'Inventarios',
      icon: () => <ModernIcons.Inventarios size={20} />,
      visible: showAllForAdmin || permissions.canRead('inventory'),
      items: [
        { href: "/inventarios", label: "Productos", icon: () => <ModernIcons.Productos size={18} /> },
        { href: "/inventarios/categorias", label: "Categorías", icon: () => <ModernIcons.Categorias size={18} /> },
        { href: "/inventarios/movimientos", label: "Movimientos", icon: () => <ModernIcons.Reportes size={18} /> }
      ]
    },
    {
      key: 'ingresos',
      label: 'Ingresos',
      icon: () => <ModernIcons.Finanzas size={20} />,
      visible: showAllForAdmin || permissions.canRead('invoices') || permissions.canPayInvoices(),
      items: [
        { href: "/ingresos", label: "Facturación", icon: () => <ModernIcons.Facturacion size={18} />, visible: permissions.canRead('invoices') },
        { href: "/cobros", label: "Cobros", icon: () => <ModernIcons.Cobros size={18} />, visible: permissions.canPayInvoices() }
      ].filter(item => item.visible)
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: () => <ModernIcons.Pagos size={20} />,
      visible: showAllForAdmin || permissions.canManagePurchases(),
      items: [
        { href: "/compras", label: "Órdenes de Compra", icon: () => <ModernIcons.OrdenesCompra size={18} /> },
        { href: "/compras/proveedores", label: "Proveedores", icon: () => <ModernIcons.Clientes size={18} />, visible: permissions.canManageSuppliers() },
        { href: "/compras/pagos", label: "Pagos", icon: () => <ModernIcons.Transfer size={18} />, visible: permissions.canPayInvoices() }
      ].filter(item => item.visible !== false)
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: () => <ModernIcons.Reportes size={20} />,
      visible: showAllForAdmin || permissions.canRead('reports'),
      items: [
        { href: "/reportes/ventas", label: "Ventas", icon: () => <ModernIcons.Finanzas size={18} />, visible: permissions.canRead('reports') },
        { href: "/reportes/inventario", label: "Inventario", icon: () => <ModernIcons.Inventarios size={18} />, visible: permissions.canRead('reports') },
        { href: "/reportes/financieros", label: "Financieros", icon: () => <ModernIcons.Financieros size={18} />, visible: permissions.canViewFinancialReports() }
      ].filter(item => item.visible)
    },
    {
      key: 'configuraciones',
      label: 'Configuraciones',
      icon: () => <ModernIcons.Configuracion size={20} />,
      visible: showAllForAdmin || permissions.canManageSettings(),
      items: [
        { href: "/configuraciones/usuarios", label: "Usuarios", icon: () => <ModernIcons.Clientes size={18} />, visible: permissions.canManageUsers() },
        { href: "/configuraciones/empresa", label: "Empresa", icon: () => <ModernIcons.Dashboard size={18} />, visible: permissions.canManageSettings() },
        { href: "/settings/billing", label: "Planes", icon: () => <CreditCard size={18} />, visible: permissions.canManageSettings() },
        { href: "/mensajeria", label: "Mensajería", icon: () => <ModernIcons.Conversaciones size={18} />, visible: permissions.canManageSettings() }
      ].filter(item => item.visible)
    }
  ].filter(section => section.visible && section.items.length > 0)
  }, [isMechanic, showAllForAdmin, permissions, sessionLoading])

  // ✅ MECÁNICOS: Solo ven Mi Perfil (Kanban ya está en mainNavItems)
  const additionalNavItems = isMechanic ? [
    { 
      href: "/perfil", 
      label: "Mi Perfil", 
      icon: () => <ModernIcons.Perfil size={20} />,
      badge: null
    }
  ] : [
    { 
      href: "/perfil", 
      label: "Mi Perfil", 
      icon: () => <ModernIcons.Perfil size={20} />,
      badge: null
    },
    { 
      href: "/ordenes/kanban", 
      label: "Kanban", 
      icon: () => <ModernIcons.Dashboard size={20} />,
      badge: null
    }
  ]

  // ✅ MECÁNICOS: No ven botones de acción adicionales
  const actionButtons = isMechanic ? [] : [
    // ✅ CITAS movido al TopBar
    {
      href: "/comercial",
      label: "Comercial",
      icon: () => <ModernIcons.Conversaciones size={20} />,
      variant: "secondary" as const,
      badge: "New"
    }
  ]

  // ✅ OPTIMIZACIÓN: useCallback para memoizar función isActive
  const isActive = useCallback((href: string) => {
    if (href === "/") return pathname === "/"
    
    // ✅ FIX: Usar coincidencia exacta para evitar resaltar padre e hijo simultáneamente
    // Si la ruta es exactamente igual, está activa
    if (pathname === href) {
      return true
    }
    
    // ✅ FIX CRÍTICO: Para sub-items de secciones colapsables, SIEMPRE usar coincidencia exacta
    // Esto evita que tanto la sección padre como el sub-item se resalten simultáneamente
    const isCollapsibleSectionItem = collapsibleSections.some(section => 
      section.items.some((item: any) => item.href === href)
    )
    
    if (isCollapsibleSectionItem) {
      // Para sub-items de secciones colapsables, solo activar si es exactamente igual
      return pathname === href
    }
    
    // ✅ FIX ADICIONAL: Para rutas padre de secciones colapsables (como /compras, /ingresos)
    // NO activar si hay un sub-item más específico activo
    const isParentOfCollapsibleSection = collapsibleSections.some(section => {
      const sectionRoutes: Record<string, string[]> = {
        'inventarios': ['/inventarios', '/inventarios/productos', '/inventarios/categorias', '/inventarios/movimientos'],
        'ingresos': ['/ingresos', '/ingresos/facturacion', '/cobros', '/ingresos/reportes'],
        'compras': ['/compras', '/compras/proveedores', '/compras/pagos'],
        'reportes': ['/reportes', '/reportes/ventas', '/reportes/inventario', '/reportes/financieros'],
        'configuraciones': ['/configuraciones', '/configuraciones/empresa', '/configuraciones/usuarios', '/configuraciones/sistema', '/settings/billing', '/mensajeria', '/mensajeria/email', '/mensajeria/whatsapp', '/perfil']
      }
      const sectionRoutesList = sectionRoutes[section.key] || []
      return sectionRoutesList.includes(href) && sectionRoutesList.some(route => 
        pathname === route && route !== href && route.startsWith(href)
      )
    })
    
    if (isParentOfCollapsibleSection) {
      return false
    }
    
    // Para rutas que son prefijos (como /inventarios), verificar si hay un sub-item activo
    // Si hay un sub-item activo que es más específico, no activar el padre
    const hasMoreSpecificActive = collapsibleSections.some(section => 
      section.items.some((item: any) => {
        // Si hay un sub-item que está activo y es más específico que href
        return pathname === item.href && item.href.startsWith(href) && item.href !== href
      })
    )
    
    // Si hay un hijo más específico activo, no activar el padre
    if (hasMoreSpecificActive) {
      return false
    }
    
    // Para rutas de inventario, usar coincidencia exacta
    if (href.includes('/inventario')) {
      return pathname === href
    }
    
    // Para otras rutas, usar startsWith solo si no hay hijos más específicos
    return pathname.startsWith(href)
  }, [pathname, collapsibleSections])
  
  // ✅ Helper: Verificar si algún sub-item de una sección está activo
  const hasActiveSubItem = (section: typeof collapsibleSections[0]) => {
    return section.items.some((item: any) => isActive(item.href))
  }

  return (
    <div 
      className={cn(
        "flex flex-col h-screen bg-card border-r overflow-hidden transition-all duration-300 relative z-10",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
      data-tour="sidebar"
    >
      {/* Header */}
      <div className={cn(
        "border-b border-border overflow-hidden relative",
        isCollapsed ? "p-4 py-6" : "pt-6 pb-4"
      )}>
        {/* Botón de colapsar/expandir - fuera del flujo para no afectar centrado */}
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "text-foreground hover:text-primary transition-colors absolute z-10",
            isCollapsed 
              ? "top-2 right-2" 
              : "top-2 right-2"
          )}
          onClick={toggleCollapse}
          title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {/* Logo y texto - centrado perfecto compensando el botón */}
        <div className={cn(
          "flex w-full",
          isCollapsed ? "flex-col items-center justify-center gap-3" : "flex-col items-center justify-center gap-1.5",
          !isCollapsed && "px-4 pr-10" // ✅ Padding izquierdo normal, derecho reducido para compensar botón
        )}>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={cn(
              "transition-all bg-transparent hover:opacity-90 flex flex-col items-center justify-center w-full",
              isCollapsed && "gap-2"
            )}
            aria-label="Ir al dashboard"
          >
            <div className="flex items-center justify-center w-full">
              <img
                src={logoUrl}
                alt="EAGLES SYSTEM"
                className={cn(
                  "rounded-md shadow-sm transition-all hover:scale-[1.02] focus:outline-none",
                  "object-contain object-center"
                )}
                style={{
                  width: isCollapsed ? '56px' : 'auto',
                  height: isCollapsed ? '56px' : '96px', // ✅ 20% más grande: 80px * 1.2 = 96px
                  maxWidth: isCollapsed ? '56px' : '280px',
                  maxHeight: isCollapsed ? '56px' : '96px',
                  margin: '0 auto'
                }}
              />
            </div>
            {/* Texto EAGLES SYSTEM - solo cuando sidebar no está colapsado */}
            {!isCollapsed && (
              <span className="text-xs font-bold text-white/95 mt-0.5 tracking-wider text-center w-full block">
                EAGLES SYSTEM
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Main Navigation */}
        <div className={isCollapsed ? "space-y-3" : "space-y-1"}>
          <Link href="/dashboard">
            <Button
              variant={isActive("/dashboard") ? "primary" : "ghost"}
              className={cn(
                "transition-all duration-200",
                isCollapsed 
                  ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                  : "w-full gap-3 justify-start h-10",
                isActive("/dashboard") && "bg-primary text-white"
              )}
              title={isCollapsed ? "Dashboard" : ""}
            >
              <ModernIcons.Dashboard size={isCollapsed ? 24 : 16} />
              {!isCollapsed && <span className="text-sm font-medium">Dashboard</span>}
            </Button>
          </Link>          {/*  Clientes movido al TopBar */}
          
          {/* ✅ Órdenes, Reportes y WhatsApp movidos al TopBar */}
        </div>

        {/* Collapsible Sections */}
        <div className={isCollapsed ? "space-y-3" : "space-y-1"}>
          {collapsibleSections.map((section) => (
            <div key={section.key}>
              {isCollapsed ? (
                // Versión colapsada: solo icono
                // ✅ FIX: En modo colapsado, resaltar solo si hay un sub-item activo (pero no la sección padre)
                <Link href={section.items.find((item: any) => isActive(item.href))?.href || section.items[0]?.href || "#"}>
                  <Button
                    variant={section.items.some((item: any) => isActive(item.href)) ? "primary" : "ghost"}
                    className={cn(
                      "transition-all duration-200",
                      "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60",
                      // ✅ Solo resaltar si hay sub-item activo, pero NO resaltar la sección padre
                      section.items.some((item: any) => isActive(item.href)) && "bg-primary text-white"
                    )}
                    title={section.label}
                  >
                    {section.icon()}
                  </Button>
                </Link>
              ) : (
                // Versión expandida: con texto y sub-items
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between gap-3 h-10",
                      // ✅ FIX: NO resaltar la sección padre si hay sub-items activos
                      // Solo mostrar opacidad reducida para indicar que hay un hijo activo
                      hasActiveSubItem(section) && "opacity-50"
                    )}
                    onClick={() => toggleSection(section.key)}
                  >
                    <div className="flex items-center gap-3">
                      {section.icon()}
                      {section.label}
                    </div>
                    {shouldExpandSection(section.key) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {shouldExpandSection(section.key) && (
                    <div className="ml-6 space-y-1 mt-1">
                      {section.items
                        .filter((item: any) => item.visible !== false)
                        .map((item: any) => {
                          const itemIsActive = isActive(item.href)
                          return (
                            <Link key={item.href} href={item.href}>
                              <Button
                                variant={itemIsActive ? "primary" : "ghost"}
                                className={cn(
                                  "w-full justify-start gap-3 h-8 text-sm",
                                  // ✅ Solo resaltar el sub-item activo, NO la sección padre
                                  itemIsActive && "bg-primary text-white shadow-lg shadow-primary/20"
                                )}
                              >
                                {item.icon()}
                                {item.label}
                              </Button>
                            </Link>
                          )
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Additional Navigation */}
        <div className={isCollapsed ? "space-y-3 pt-4 border-t" : "space-y-1 pt-4 border-t"}>
          {additionalNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "primary" : "ghost"}
                className={cn(
                  "transition-all duration-200",
                  isCollapsed 
                    ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                    : "w-full gap-3 justify-start h-10",
                  isActive(item.href) && "bg-primary text-white"
                )}
                title={isCollapsed ? item.label : ""}
              >
                {item.icon()}
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                  </Badge>
                  )}
              </Button>
                </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className={isCollapsed ? "space-y-3 pt-4 border-t" : "space-y-2 pt-4 border-t"}>
          {actionButtons.map((button) => (
            <Link key={button.href} href={button.href}>
              <Button
                variant={button.variant}
                className={cn(
                  "transition-all duration-200",
                  isCollapsed 
                    ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                    : "w-full gap-3 justify-start h-10"
                )}
                title={isCollapsed ? button.label : ""}
              >
                {button.icon()}
                {!isCollapsed && <span className="text-sm font-medium">{button.label}</span>}
                {!isCollapsed && button.badge && (
                  <Badge variant="secondary" className="ml-auto bg-green-500">
                    {button.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto space-y-2">
        <SidebarUserProfile />
      </div>
    </div>
  )
}
