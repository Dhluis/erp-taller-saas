"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Notifications } from "@/components/notifications"
import { UserProfile } from "@/components/user-profile"
import { 
  Home, 
  Users, 
  Car, 
  FileText, 
  Package, 
  Receipt,
  BarChart3,
  Settings,
  Bell,
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
      label: "Métricas", 
      icon: BarChart3,
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
    }
  ]

  const collapsibleSections = [
    {
      key: 'inventarios',
      label: 'Inventarios',
      icon: Package,
      items: [
        { href: "/inventario", label: "Productos", icon: Package },
        { href: "/inventario/categorias", label: "Categorías", icon: Package },
        { href: "/inventario/movimientos", label: "Movimientos", icon: TrendingUp }
      ]
    },
    {
      key: 'ingresos',
      label: 'Ingresos',
      icon: TrendingUp,
      items: [
        { href: "/ingresos/facturacion", label: "Facturación", icon: FileText },
        { href: "/ingresos/cobros", label: "Cobros", icon: Wallet },
        { href: "/ingresos/reportes", label: "Reportes", icon: BarChart3 }
      ]
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: TrendingUp,
      items: [
        { href: "/compras/ordenes", label: "Órdenes", icon: FileText },
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

  const serviceNavItems = [
    { 
      href: "/ordenes", 
      label: "Órdenes de servicio", 
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

  const actionButtons = [
    {
      href: "/citas",
      label: "Citas",
      icon: Calendar,
      variant: "outline" as const,
      badge: "New"
    },
    {
      href: "/comercial",
      label: "Comercial",
      icon: MessageCircle,
      variant: "outline" as const,
      badge: "New"
    }
  ]

  const configSections = [
    {
      key: 'configuraciones',
      label: 'Configuraciones',
      icon: Settings,
      items: [
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
    <div className={cn("flex flex-col h-full bg-card border-r", className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            EAGLES
          </h1>
          <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">ERP Taller SaaS</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive(item.href) && "bg-primary text-primary-foreground"
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
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-8 text-sm",
                          isActive(item.href) && "bg-primary text-primary-foreground"
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

        {/* Service Navigation */}
        <div className="space-y-1 pt-4 border-t">
          {serviceNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive(item.href) && "bg-primary text-primary-foreground"
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
                  <Badge variant="default" className="ml-auto bg-green-500">
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
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-8 text-sm",
                          isActive(item.href) && "bg-primary text-primary-foreground"
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
      <div className="p-4 border-t space-y-2">
        <Button variant="ghost" className="w-full justify-between gap-3" asChild>
          <Link href="#" onClick={(e) => {
            e.preventDefault()
            // Abrir notificaciones programáticamente
            const headerNotifications = document.querySelector('[data-notifications-trigger]')
            if (headerNotifications) {
              (headerNotifications as HTMLElement).click()
            }
          }}>
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4" />
              Notificaciones
            </div>
            <Badge variant="destructive" className="ml-auto">2</Badge>
          </Link>
        </Button>
        
        <UserProfile />
        
        <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600">
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
