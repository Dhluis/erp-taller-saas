"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarUserProfile } from "@/components/sidebar-user-profile"
import {
  Home, 
  Users, 
  FileText, 
  Package, 
  Receipt,
  BarChart3,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  MessageCircle,
  MessageSquare,
  Phone,
  Building2,
  ClipboardList,
  TrendingUp,
  Wallet,
  Shield,
  User,
  LogOut,
  Kanban,
  LayoutGrid
} from "lucide-react"
import { TruckIcon } from '@heroicons/react/24/outline'
import { useSidebar } from '@/contexts/SidebarContext'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { isCollapsed, toggleCollapse } = useSidebar()
  const logoUrl = "https://i.ibb.co/yFmC8Lx/Whats-App-Image-2025-11-03-at-6-01-33-PM.jpg"

  // Inicializar secciones expandidas después de la hidratación
  useEffect(() => {
    setExpandedSections(['inventarios', 'ingresos', 'compras', 'reportes', 'configuraciones'])
  }, [])

  // Mantener secciones expandidas por defecto
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
      icon: Home,
      badge: null
    },
    { 
      href: "/clientes", 
      label: "Clientes", 
      icon: Users,
      badge: null
    },
    { 
      href: "/proveedores", 
      label: "Proveedores", 
      icon: Building2,
      badge: null
    },
    { 
      href: "/vehiculos", 
      label: "Vehículos", 
      icon: TruckIcon,
      badge: null
    },
    { 
      href: "/ordenes", 
      label: "Lista de Órdenes", 
      icon: FileText,
      badge: null
    },
    {
      href: "/cotizaciones",
      label: "Cotizaciones",
      icon: Receipt,
      badge: null
    },
    {
      href: "/dashboard/whatsapp",
      label: "WhatsApp",
      icon: MessageSquare,
      badge: null
    }
  ]

  const collapsibleSections = [
    {
      key: 'inventarios',
      label: 'Inventarios',
      icon: Package,
      items: [
        { href: "/inventarios", label: "Productos", icon: Package },
        { href: "/inventarios/categorias", label: "Categorías", icon: Package },
        { href: "/inventarios/movimientos", label: "Movimientos", icon: TrendingUp }
      ]
    },
    {
      key: 'ingresos',
      label: 'Ingresos',
      icon: TrendingUp,
      items: [
        { href: "/ingresos", label: "Facturación", icon: FileText },
        { href: "/cobros", label: "Cobros", icon: Wallet },
        { href: "/ingresos/reportes", label: "Reportes", icon: BarChart3 }
      ]
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: TrendingUp,
      items: [
        { href: "/compras", label: "Órdenes de Compra", icon: ClipboardList },
        { href: "/compras/proveedores", label: "Proveedores", icon: Building2 },
        { href: "/compras/pagos", label: "Pagos", icon: Wallet }
      ]
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: BarChart3,
      items: [
        { href: "/reportes/ventas", label: "Ventas", icon: TrendingUp },
        { href: "/reportes/inventario", label: "Inventario", icon: Package },
        { href: "/reportes/financieros", label: "Financieros", icon: Wallet }
      ]
    }
  ]

  const additionalNavItems = [
    { 
      href: "/perfil", 
      label: "Mi Perfil", 
      icon: User,
      badge: null
    },
    { 
      href: "/ordenes/kanban", 
      label: "Kanban", 
      icon: LayoutGrid,
      badge: null
    }
  ]

  const actionButtons = [
    {
      href: "/citas",
      label: "Citas",
      icon: Calendar,
      variant: "secondary" as const,
      badge: "New"
    },
    {
      href: "/comercial",
      label: "Comercial",
      icon: MessageCircle,
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
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <a
            href="https://ibb.co/yFmC8Lx6"
            className={cn(
              "flex items-center transition-all",
              isCollapsed ? "justify-center w-full" : "gap-3"
            )}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="https://i.ibb.co/d4svQnHP/Whats-App-Image-2025-11-03-at-6-01-33-PM.png"
              alt="Whats-App-Image-2025-11-03-at-6-01-33-PM"
              className={cn(
                "rounded-md shadow-sm transition-all",
                isCollapsed ? "h-10 w-10 object-cover" : "h-16 w-auto"
              )}
            />
          </a>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-foreground hover:text-primary"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
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
              <Home className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
              {!isCollapsed && <span className="text-sm font-medium">Dashboard</span>}
            </Button>
          </Link>
          
          <Link href="/clientes">
            <Button
              variant={isActive("/clientes") ? "primary" : "ghost"}
              className={cn(
                "transition-all duration-200",
                isCollapsed 
                  ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                  : "w-full gap-3 justify-start h-10",
                isActive("/clientes") && "bg-primary text-white"
              )}
              title={isCollapsed ? "Clientes" : ""}
            >
              <Users className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
              {!isCollapsed && <span className="text-sm font-medium">Clientes</span>}
            </Button>
          </Link>
          
          <Link href="/ordenes">
            <Button
              variant={isActive("/ordenes") ? "primary" : "ghost"}
              className={cn(
                "transition-all duration-200",
                isCollapsed 
                  ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                  : "w-full gap-3 justify-start h-10",
                isActive("/ordenes") && "bg-primary text-white"
              )}
              title={isCollapsed ? "Órdenes" : ""}
            >
              <FileText className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
              {!isCollapsed && <span className="text-sm font-medium">Órdenes</span>}
            </Button>
          </Link>
          
          <Link href="/reportes">
            <Button
              variant={isActive("/reportes") ? "primary" : "ghost"}
              className={cn(
                "transition-all duration-200",
                isCollapsed 
                  ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                  : "w-full gap-3 justify-start h-10",
                isActive("/reportes") && "bg-primary text-white"
              )}
              title={isCollapsed ? "Reportes" : ""}
            >
              <BarChart3 className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
              {!isCollapsed && <span className="text-sm font-medium">Reportes</span>}
            </Button>
          </Link>

          {/* WhatsApp Business Integration */}
          <Link href="/dashboard/whatsapp">
            <Button
              variant={isActive("/dashboard/whatsapp") ? "primary" : "ghost"}
              className={cn(
                "transition-all duration-200",
                isCollapsed 
                  ? "w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-xl hover:bg-gray-800/60" 
                  : "w-full gap-3 justify-start h-10",
                isActive("/dashboard/whatsapp") && "bg-primary text-white"
              )}
              title={isCollapsed ? "WhatsApp" : ""}
            >
              <MessageSquare className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
              {!isCollapsed && <span className="text-sm font-medium">WhatsApp</span>}
            </Button>
          </Link>
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
                    <section.icon className="w-6 h-6" />
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
                      <section.icon className="h-4 w-4" />
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
                            <item.icon className="h-3 w-3" />
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
                <item.icon className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
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
                <button.icon className={isCollapsed ? "w-6 h-6" : "h-4 w-4 flex-shrink-0"} />
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
