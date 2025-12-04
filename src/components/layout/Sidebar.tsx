"use client"

import { useState, useEffect } from "react"
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
  LogOut
} from "lucide-react"
import { useSidebar } from '@/contexts/SidebarContext'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { isCollapsed, toggleCollapse } = useSidebar()
  // Logo actualizado - EAGLES GEAR SYSTEM
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
        'configuraciones': ['/configuraciones', '/configuraciones/empresa', '/configuraciones/usuarios', '/configuraciones/sistema', '/perfil']
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

  const mainNavItems = [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: () => <ModernIcons.Dashboard size={20} />,
      badge: null
    },
    // Clientes movido al TopBar
    { 
      href: "/proveedores", 
      label: "Proveedores", 
      icon: () => <ModernIcons.Clientes size={20} />,
      badge: null
    },
    { 
      href: "/vehiculos", 
      label: "Vehículos", 
      icon: () => <ModernIcons.Vehiculos size={20} />,
      badge: null
    },
    // Órdenes movido al TopBar
    {
      href: "/cotizaciones",
      label: "Cotizaciones",
      icon: () => <ModernIcons.Cotizaciones size={20} />,
      badge: null
    }
    // WhatsApp movido al TopBar
  ]

  const collapsibleSections = [
    {
      key: 'inventarios',
      label: 'Inventarios',
      icon: () => <ModernIcons.Inventarios size={20} />,
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
      items: [
        { href: "/ingresos", label: "Facturación", icon: () => <ModernIcons.Ordenes size={18} /> },
        { href: "/cobros", label: "Cobros", icon: () => <ModernIcons.Cobros size={18} /> }
      ]
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: () => <ModernIcons.Pagos size={20} />,
      items: [
        { href: "/compras", label: "Órdenes de Compra", icon: () => <ModernIcons.Ordenes size={18} /> },
        { href: "/compras/proveedores", label: "Proveedores", icon: () => <ModernIcons.Clientes size={18} /> },
        { href: "/compras/pagos", label: "Pagos", icon: () => <ModernIcons.Transfer size={18} /> }
      ]
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: () => <ModernIcons.Reportes size={20} />,
      items: [
        { href: "/reportes/ventas", label: "Ventas", icon: () => <ModernIcons.Finanzas size={18} /> },
        { href: "/reportes/inventario", label: "Inventario", icon: () => <ModernIcons.Inventarios size={18} /> },
        { href: "/reportes/financieros", label: "Financieros", icon: () => <ModernIcons.Financieros size={18} /> }
      ]
    },
    {
      key: 'configuraciones',
      label: 'Configuraciones',
      icon: () => <ModernIcons.Configuracion size={20} />,
      items: [
        { href: "/configuraciones/usuarios", label: "Usuarios", icon: () => <ModernIcons.Clientes size={18} /> },
        { href: "/configuraciones/empresa", label: "Empresa", icon: () => <ModernIcons.Dashboard size={18} /> }
      ]
    }
  ]

  const additionalNavItems = [
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

  const actionButtons = [
    // ✅ CITAS movido al TopBar
    {
      href: "/comercial",
      label: "Comercial",
      icon: () => <ModernIcons.Conversaciones size={20} />,
      variant: "secondary" as const,
      badge: "New"
    }
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    
    // Para rutas de inventario, usar coincidencia exacta
    if (href.includes('/inventario/')) {
      return pathname === href
    }
    
    // Para otras rutas, usar startsWith
    return pathname.startsWith(href)
  }

  return (
    <div className={cn(
      "flex flex-col h-screen bg-card border-r overflow-hidden transition-all duration-300 relative z-10",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
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
                alt="EAGLES GEAR SYSTEM"
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
                <Link href={section.items[0]?.href || "#"}>
                  <Button
                    variant={section.items.some(item => isActive(item.href)) ? "primary" : "ghost"}
                    className={cn(
                      "transition-all duration-200",
                      "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60",
                      section.items.some(item => isActive(item.href)) && "bg-primary text-white"
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
                    className="w-full justify-between gap-3 h-10"
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
                      {section.items.map((item) => (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive(item.href) ? "primary" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3 h-8 text-sm",
                              isActive(item.href) && "bg-primary text-white"
                            )}
                          >
                            {item.icon()}
                            {item.label}
                          </Button>
                        </Link>
                      ))}
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
