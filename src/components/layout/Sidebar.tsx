"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal'
import ModernIcons from '@/components/icons/ModernIcons'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  LogOut,
  CreditCard,
  RotateCcw,
  Package,
  Wallet,
  ClipboardCheck,
  Receipt
} from "lucide-react"
import { useSidebar } from '@/contexts/SidebarContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/lib/context/SessionContext'
import { PWAInstallButton } from '@/components/layout/PWAInstallButton'
import { Logo } from '@/components/ui/Logo'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { isCollapsed, toggleCollapse } = useSidebar()
  const permissions = usePermissions()
  const { isLoading: sessionLoading, organizationId, companySettings } = useSession()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [magicCreateData, setMagicCreateData] = useState<any>(null)
  const searchParams = useSearchParams()

  // Efecto global para capturar datos de Confia Drive AI de la URL
  useEffect(() => {
    const openMagicCreate = searchParams.get('openMagicCreate');
    if (openMagicCreate === 'true') {
      try {
        let aiDataRaw = sessionStorage.getItem('confiadrive_ai_pending_data');
        if (!aiDataRaw) {
          aiDataRaw = searchParams.get('aiData');
        }

        if (aiDataRaw) {
          const parsedData = JSON.parse(aiDataRaw);
          console.log('✨ [Sidebar] Capturado Confia Drive AI global:', parsedData);
          
          if (parsedData.action_type === 'work-order' || !parsedData.action_type) {
            setMagicCreateData(parsedData);
            setIsModalOpen(true);
            toast.info('IA preparó una orden de trabajo');
            
            // Limpiar URL y Storage
            sessionStorage.removeItem('confiadrive_ai_pending_data');
            const newPath = window.location.pathname;
            window.history.replaceState({}, '', newPath);
          }
        }
      } catch (e) {
        console.error('❌ [Sidebar] Error al procesar datos de AI:', e);
      }
    }
  }, [searchParams]);

  // Inicializar secciones expandidas solo si la ruta actual está dentro de una sección
  useEffect(() => {
    const sections = ['inventarios', 'finanzas', 'reportes', 'configuraciones']
    const activeSections: string[] = []
    
    // Verificar si la ruta actual está dentro de alguna sección
    sections.forEach(section => {
      const sectionRoutes: Record<string, string[]> = {
        'inventarios': ['/inventarios', '/inventarios/productos', '/inventarios/categorias', '/inventarios/movimientos', '/service-packages'],
        'finanzas': ['/finanzas', '/finanzas/cuentas', '/finanzas/pagos-gastos', '/ingresos', '/ingresos/facturacion', '/ingresos/cuentas-efectivo', '/ingresos/ajustes-devoluciones', '/ingresos/entregas', '/ingresos/arqueo-caja'],
        'reportes': ['/reportes', '/reportes/ventas', '/reportes/ventas-por-items', '/reportes/inventario', '/reportes/financieros', '/reportes/operaciones'],
        'configuraciones': ['/configuraciones', '/configuraciones/empresa', '/configuraciones/usuarios', '/configuraciones/sistema', '/settings/billing', '/perfil']
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
    // CRM / Leads movido al TopBar
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
        { href: "/inventarios/movimientos", label: "Movimientos", icon: () => <ModernIcons.Reportes size={18} /> },
        { href: "/service-packages", label: "Paquetes de Servicio", icon: () => <ModernIcons.Package size={18} /> }
      ]
    },
    {
      key: 'finanzas',
      label: 'Finanzas',
      icon: () => <ModernIcons.Finanzas size={20} />,
      visible: showAllForAdmin || permissions.canRead('invoices') || permissions.canPayInvoices() || permissions.canManagePurchases(),
      items: [
        { href: "/finanzas", label: "Resumen del Día", icon: () => <ClipboardCheck size={18} className="text-cyan-400" />, visible: true },
        { href: "/ingresos/facturacion", label: "Facturación", icon: () => <ModernIcons.Facturacion size={18} />, visible: permissions.canRead('invoices') },
        { href: "/finanzas/cuentas", label: "Cuentas", icon: () => <Wallet size={18} className="text-emerald-400" />, visible: permissions.canPayInvoices() },
        { href: "/finanzas/pagos-gastos", label: "Entradas y Salidas", icon: () => <Receipt size={18} className="text-orange-400" />, visible: permissions.canPayInvoices() },
        { href: "/proveedores", label: "Proveedores", icon: () => <ModernIcons.Clientes size={18} />, visible: permissions.canManageSuppliers() },
      ].filter(item => item.visible !== false)
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: () => <ModernIcons.Reportes size={20} />,
      visible: showAllForAdmin || permissions.canRead('reports'),
      items: [
        { href: "/reportes/ventas", label: "Ventas", icon: () => <ModernIcons.Finanzas size={18} />, visible: permissions.canRead('reports') },
        { href: "/reportes/ventas-por-items", label: "Ventas Por Ítems", icon: () => <ModernIcons.Package size={18} />, visible: permissions.canViewFinancialReports() },
        { href: "/reportes/inventario", label: "Inventario", icon: () => <ModernIcons.Inventarios size={18} />, visible: permissions.canRead('reports') },
        { href: "/reportes/financieros", label: "Financieros", icon: () => <ModernIcons.Financieros size={18} />, visible: permissions.canViewFinancialReports() },
        { href: "/reportes/operaciones", label: "Operaciones", icon: () => <ModernIcons.Ordenes size={18} />, visible: permissions.canRead('reports') }
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
        { href: "/settings/billing", label: "Planes", icon: () => <CreditCard size={18} className="text-yellow-500" />, visible: permissions.canManageSettings() },

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

  // ✅ MECÁNICOS: No ven botones de acción adicionales (Leads movido a mainNavItems)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionButtons: any[] = []

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
        'inventarios': ['/inventarios', '/inventarios/productos', '/inventarios/categorias', '/inventarios/movimientos', '/service-packages'],
        'ingresos': ['/ingresos', '/ingresos/facturacion', '/cobros', '/ingresos/cuentas-efectivo', '/ingresos/ajustes-devoluciones', '/ingresos/entregas', '/ingresos/arqueo-caja', '/ingresos/reportes'],
        'compras': ['/compras', '/compras/proveedores', '/compras/pagos', '/compras/gastos'],
        'reportes': ['/reportes', '/reportes/ventas', '/reportes/ventas-por-items', '/reportes/inventario', '/reportes/financieros', '/reportes/operaciones'],
        'configuraciones': ['/configuraciones', '/configuraciones/empresa', '/configuraciones/usuarios', '/configuraciones/sistema', '/settings/billing', '/perfil']
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
        "flex flex-col h-screen overflow-hidden transition-all duration-500 ease-in-out relative z-10",
        "bg-[#0a0c10] border-r border-white/5",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Background Glows (Premium look) */}
      {!isCollapsed && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/20 blur-[100px] rounded-full" />
          <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-indigo-500/20 blur-[80px] rounded-full" />
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "overflow-hidden relative z-20 backdrop-blur-sm bg-white/[0.02]",
        isCollapsed ? "p-4 py-8" : "pt-8 pb-6 px-4"
      )}>
        {/* Botón de colapsar/expandir - versión flotante moderna */}
        <button 
          onClick={toggleCollapse}
          className={cn(
            "absolute z-50 transition-all duration-500 flex items-center justify-center",
            "bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/50 text-white/50 hover:text-primary",
            "backdrop-blur-md rounded-lg shadow-xl",
            isCollapsed 
              ? "top-4 left-1/2 -translate-x-1/2 w-10 h-10" 
              : "top-4 right-4 w-8 h-8"
          )}
          title={isCollapsed ? "Expandir" : "Colapsar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Logo y texto - centrado perfecto */}
        <div className={cn(
          "flex flex-col items-center justify-center transition-all duration-500",
          isCollapsed ? "gap-4 scale-90" : "gap-3"
        )}>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="relative group focus:outline-none"
            aria-label="Ir al dashboard"
          >
            {/* Logo Glow */}
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center justify-center">
              <Logo 
                className={cn(
                  "transition-all duration-500 group-hover:scale-105",
                  "drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]",
                  isCollapsed ? "!w-10 !h-10" : "!w-44 !h-14"
                )}
                size={isCollapsed ? 'sm' : 'xl'}
              />
            </div>
          </button>
        </div>
      </div>


      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">

        {/* Main Navigation */}
        <div className={isCollapsed ? "space-y-3" : "space-y-1"}>
          <Link href="/dashboard">
            <Button
              variant={isActive("/dashboard") ? "primary" : "ghost"}
              className={cn(
                "transition-all duration-300 relative group overflow-hidden",
                isCollapsed 
                  ? "w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-xl" 
                  : "w-full gap-3 justify-start h-11 px-4 mb-1 rounded-xl",
                isActive("/dashboard") 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
              title={isCollapsed ? "Dashboard" : ""}
            >
              <ModernIcons.Dashboard size={isCollapsed ? 24 : 18} />
              {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Dashboard</span>}
              
              {/* Active Indicator */}
              {isActive("/dashboard") && !isCollapsed && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
              )}
            </Button>
          </Link>

          {/* CRM / Leads movido al TopBar */}

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
                      "w-full justify-between gap-3 h-11 px-4 rounded-xl transition-all duration-300",
                      "text-white/60 hover:text-white hover:bg-white/5",
                      hasActiveSubItem(section) && "text-white bg-white/5"
                    )}
                    onClick={() => toggleSection(section.key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        hasActiveSubItem(section) ? "bg-blue-500/20 text-blue-400" : "text-inherit"
                      )}>
                        {section.icon()}
                      </div>
                      <span className="text-sm font-semibold tracking-wide">{section.label}</span>
                    </div>
                    {shouldExpandSection(section.key) ? (
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                  
                  {shouldExpandSection(section.key) && (
                    <div className="ml-9 space-y-1 mt-1 border-l border-white/10 pl-2">
                      {section.items
                        .filter((item: any) => item.visible !== false)
                        .map((item: any) => {
                          const itemIsActive = isActive(item.href)
                          return (
                            <Link key={item.href} href={item.href} target={item.target} rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}>
                              <Button
                                variant={itemIsActive ? "primary" : "ghost"}
                                className={cn(
                                  "w-full justify-start gap-3 h-9 px-3 text-xs font-medium rounded-lg transition-all duration-300",
                                  itemIsActive 
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                                    : "text-white/40 hover:text-white hover:bg-white/5"
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

        {/* Instalar App (PWA) */}
        <PWAInstallButton isCollapsed={isCollapsed} />
      </div>

      {/* Footer - NUEVA ORDEN */}
      <div className={cn(
        "mt-auto border-t border-border bg-slate-900/40 backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "p-4" : "p-4"
      )}>
        {permissions.canCreate('work_orders') && !isMechanic && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "w-full transition-all duration-300 shadow-xl group",
              "bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 hover:from-indigo-500 hover:via-blue-500 hover:to-violet-500",
              "text-white border-none font-bold",
              isCollapsed 
                ? "h-12 w-12 p-0 mx-auto rounded-xl flex items-center justify-center" 
                : "h-12 px-5 gap-3 justify-start rounded-xl"
            )}
            title={isCollapsed ? "Nueva Orden de Trabajo" : ""}
          >
            <Plus className={cn(
              "transition-transform duration-300 group-hover:rotate-90",
              isCollapsed ? "h-6 w-6" : "h-5 w-5"
            )} />
            {!isCollapsed && (
              <span className="text-sm font-bold uppercase tracking-wider">Nueva Orden</span>
            )}
          </Button>
        )}
      </div>

      {/* Modal Global de Creación de Orden */}
      <CreateWorkOrderModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={() => {
          setIsModalOpen(false)
          setMagicCreateData(null)
          router.refresh()
        }}
        initialData={magicCreateData}
        organizationId={organizationId}
      />
    </div>
  )
}



