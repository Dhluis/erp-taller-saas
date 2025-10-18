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
  Phone,
  Building2,
  ClipboardList,
  TrendingUp,
  Wallet,
  Shield,
  User,
  LogOut
} from "lucide-react"
import { TruckIcon } from '@heroicons/react/24/outline'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>([])

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
      href: "/", 
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
      label: "Órdenes de Trabajo", 
      icon: FileText,
      badge: null
    },
    { 
      href: "/cotizaciones", 
      label: "Cotizaciones", 
      icon: Receipt,
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
      href: "/reportes", 
      label: "Reportes", 
      icon: BarChart3,
      badge: null
    },
    { 
      href: "/perfil", 
      label: "Mi Perfil", 
      icon: User,
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

  const configSections = [
    {
      key: 'configuraciones',
      label: 'Configuraciones',
      icon: Settings,
      items: [
        { href: "/perfil", label: "Mi Perfil", icon: User },
        { href: "/configuraciones/empresa", label: "Empresa", icon: Building2 },
        { href: "/configuraciones/usuarios", label: "Usuarios", icon: Users },
        { href: "/configuraciones/sistema", label: "Sistema", icon: Settings }
      ]
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
    <div className={cn("flex flex-col h-screen bg-card border-r overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            EAGLES
          </h1>
          <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">ERP Taller SaaS</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          <Link href="/">
            <Button
              variant={isActive("/") ? "primary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isActive("/") && "bg-primary text-white"
              )}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          
          <Link href="/clientes">
            <Button
              variant={isActive("/clientes") ? "primary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isActive("/clientes") && "bg-primary text-white"
              )}
            >
              <Users className="h-4 w-4" />
              Clientes
            </Button>
          </Link>
          
          <Link href="/ordenes">
            <Button
              variant={isActive("/ordenes") ? "primary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isActive("/ordenes") && "bg-primary text-white"
              )}
            >
              <FileText className="h-4 w-4" />
              Órdenes
            </Button>
          </Link>
          
          <Link href="/reportes">
            <Button
              variant={isActive("/reportes") ? "primary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                isActive("/reportes") && "bg-primary text-white"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Reportes
            </Button>
          </Link>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-1">
          {collapsibleSections.map((section) => (
            <div key={section.key}>
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
                          isActive(item.href) && "sidebar-subcategory-active"
                        )}
                      >
                        <item.icon className="h-3 w-3" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional Navigation */}
        <div className="space-y-1 pt-4 border-t">
          {additionalNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "primary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive(item.href) && "bg-primary text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t">
          {actionButtons.map((button) => (
            <Link key={button.href} href={button.href}>
              <Button
                variant={button.variant}
                className="w-full justify-start gap-3 h-10"
              >
                <button.icon className="h-4 w-4" />
                {button.label}
                {button.badge && (
                  <Badge variant="secondary" className="ml-auto bg-green-500">
                    {button.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>

        {/* Configuration Sections */}
        <div className="space-y-1 pt-4 border-t">
          {configSections.map((section) => (
            <div key={section.key}>
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
                          isActive(item.href) && "sidebar-subcategory-active"
                        )}
                      >
                        <item.icon className="h-3 w-3" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
