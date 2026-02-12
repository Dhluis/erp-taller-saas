"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarUserProfile } from "@/components/sidebar-user-profile"
import ModernIcons from '@/components/icons/ModernIcons'
import Image from 'next/image'
import { 
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  MessageCircle,
  User,
  LogOut
} from "lucide-react"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>([])

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
      href: "/", 
      label: "Dashboard", 
      icon: () => <ModernIcons.Dashboard size={20} />,
      badge: null
    },
    { 
      href: "/clientes", 
      label: "Clientes", 
      icon: () => <ModernIcons.Clientes size={20} />,
      badge: null
    },
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
    { 
      href: "/ordenes", 
      label: "Órdenes de Trabajo", 
      icon: () => <ModernIcons.Ordenes size={20} />,
      badge: null
    },
    { 
      href: "/cotizaciones", 
      label: "Cotizaciones", 
      icon: () => <ModernIcons.Cotizaciones size={20} />,
      badge: null
    }
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
        { href: "/ingresos/facturacion", label: "Facturación", icon: () => <ModernIcons.Ordenes size={18} /> },
        { href: "/cobros", label: "Cobros", icon: () => <ModernIcons.Cobros size={18} /> },
        { href: "/ingresos/reportes", label: "Reportes", icon: () => <ModernIcons.Reportes size={18} /> }
      ]
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: () => <ModernIcons.Finanzas size={20} />,
      items: [
        { href: "/compras", label: "Órdenes de Compra", icon: () => <ModernIcons.Ordenes size={18} /> },
        { href: "/compras/proveedores", label: "Proveedores", icon: () => <ModernIcons.Clientes size={18} /> },
        { href: "/compras/pagos", label: "Pagos", icon: () => <ModernIcons.Pagos size={18} /> }
      ]
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: () => <ModernIcons.Reportes size={20} />,
      items: [
        { href: "/reportes/ventas", label: "Ventas", icon: () => <ModernIcons.Reportes size={18} /> },
        { href: "/reportes/inventario", label: "Inventario", icon: () => <ModernIcons.Inventarios size={18} /> },
        { href: "/reportes/financieros", label: "Financieros", icon: () => <ModernIcons.Finanzas size={18} /> }
      ]
    }
  ]

  const additionalNavItems = [
    { 
      href: "/reportes", 
      label: "Reportes", 
      icon: () => <ModernIcons.Reportes size={20} />,
      badge: null
    },
    { 
      href: "/perfil", 
      label: "Mi Perfil", 
      icon: () => <ModernIcons.Perfil size={20} />,
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
      icon: () => <ModernIcons.Configuracion size={20} />,
      items: [
        { href: "/perfil", label: "Mi Perfil", icon: () => <ModernIcons.Perfil size={18} /> },
        { href: "/configuraciones/empresa", label: "Empresa", icon: () => <ModernIcons.Clientes size={18} /> },
        { href: "/configuraciones/usuarios", label: "Usuarios", icon: () => <ModernIcons.Clientes size={18} /> },
        { href: "/configuraciones/sistema", label: "Sistema", icon: () => <ModernIcons.Configuracion size={18} /> }
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
          <div className="flex items-center gap-3">
            <Image
              src="/eagles-logo-new.png"
              alt="EAGLES SYSTEM"
              width={40}
              height={40}
              className="object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                EAGLES
              </h1>
              <p className="text-xs text-muted-foreground">Eagles System</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "primary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive(item.href) && "bg-primary text-white"
                )}
              >
                <item.icon />
                {item.label}
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
                  <section.icon />
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
                        <item.icon />
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
                <item.icon />
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
                <button.icon />
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
                  <section.icon />
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
                        <item.icon />
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
