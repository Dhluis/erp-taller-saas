"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PageHeader } from '@/components/navigation/page-header'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Pagination } from '@/components/ui/pagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  Plus,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  Truck,
  DollarSign,
  Phone,
  Mail,
  Loader2
} from "lucide-react"
import { getSupplierStats } from "@/lib/supabase/suppliers"
import { useSuppliers } from '@/hooks/useSuppliers'

interface PageStats {
  totalSuppliers: number
  activeSuppliers: number
  totalOrders: number
  totalAmount: number
}

export default function ProveedoresPage() {
  // ✅ Hook con paginación
  const {
    suppliers,
    loading,
    error,
    pagination,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    setSearch,
    refresh,
    createSupplier
  } = useSuppliers({
    page: 1,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc',
    autoLoad: true
  })

  // ✅ Debounce para búsqueda (800ms para mejor UX)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebouncedValue(searchTerm, 800)

  // Sincronizar búsqueda con debounce
  useEffect(() => {
    // Solo actualizar si el valor debounced cambió
    if (debouncedSearch !== undefined) {
      setSearch(debouncedSearch)
    }
  }, [debouncedSearch, setSearch])

  const [stats, setStats] = useState<PageStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalOrders: 0,
    totalAmount: 0
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    is_active: true
  })

  // ✅ Cargar stats en un useEffect separado (no paginado)
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await getSupplierStats()
        setStats({
          totalSuppliers: statsData.total || 0,
          activeSuppliers: statsData.active || 0,
          totalOrders: 0, // No disponible en statsData
          totalAmount: 0  // No disponible en statsData
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      }
    }
    loadStats()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await createSupplier(formData)
      setIsDialogOpen(false)
      // Resetear formulario
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        is_active: true
      })
      // Recargar estadísticas
      const statsData = await getSupplierStats()
      setStats({
        totalSuppliers: statsData.total || 0,
        activeSuppliers: statsData.active || 0,
        totalOrders: 0, // No disponible en statsData
        totalAmount: 0  // No disponible en statsData
      })
      // El hook ya refresca automáticamente, pero podemos llamar refresh() para asegurar
      await refresh()
    } catch (error) {
      console.error('Error creating supplier:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Ya no necesitamos filtrado local, se hace en el servidor

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="success" className="text-white">Activo</Badge>
    } else {
      return <Badge variant="error" className="text-white">Inactivo</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando proveedores...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Proveedores"
        parentPages={[]}
      />

      {/* Page Header */}
      <PageHeader
        title="Gestión de Proveedores"
        description="Administra los proveedores y sus productos"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Agregar Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border border-border shadow-lg" style={{backgroundColor: '#000000'}}>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
                <DialogDescription>
                  Completa la información del proveedor. Los campos marcados con * son obligatorios.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nombre de la empresa"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Persona de Contacto *</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="Nombre del contacto"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Número de teléfono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="correo@empresa.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Dirección completa"
                    rows={3}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">Actualmente operando</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Realizadas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total de órdenes de compra</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Comprado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalAmount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Valor total de compras</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Lista de Proveedores</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className={`absolute left-2 top-2.5 h-4 w-4 text-muted-foreground ${loading ? 'animate-pulse' : ''}`} />
            <Input
              placeholder="Buscar por nombre, contacto o ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-8"
              disabled={loading}
            />
            {searchTerm && searchTerm !== debouncedSearch && (
              <div className="absolute right-2 top-2.5">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-md border">
          <div className="w-full">
            <table className="w-full text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">ID</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Empresa</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Contacto</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Teléfono</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      {searchTerm
                        ? 'No se encontraron proveedores con los filtros aplicados'
                        : 'No hay proveedores registrados'}
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{supplier.id}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{supplier.name}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{supplier.contact_person}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{supplier.phone}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{supplier.email}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(supplier.is_active)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
              loading={loading}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </div>
    </div>
  )
}
