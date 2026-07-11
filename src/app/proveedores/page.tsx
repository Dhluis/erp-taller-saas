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
  Loader2,
  AlertCircle
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    is_active: true
  })

  const validateSupplierForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'El nombre de la empresa es requerido'
    if (!formData.contact_person.trim()) errors.contact_person = 'La persona de contacto es requerida'
    if (!formData.phone.trim()) errors.phone = 'El teléfono es requerido'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El formato de email no es válido'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0]
      setTimeout(() => {
        document.getElementById(firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        document.getElementById(firstKey)?.focus()
      }, 80)
    }
    return Object.keys(errors).length === 0
  }

  const clearFieldError = (field: string) => {
    setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

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
    if (!validateSupplierForm()) return
    setIsSubmitting(true)

    try {
      await createSupplier(formData)
      setIsDialogOpen(false)
      setFormErrors({})
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormErrors({}) }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Agregar Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border border-border shadow-lg" style={{backgroundColor: '#000000'}}>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
                <DialogDescription className="flex items-center justify-between">
                  <span>Completa la información del proveedor.</span>
                  <span className="text-xs"><span className="text-red-500">*</span> Campos obligatorios</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Banner errores */}
                {Object.keys(formErrors).length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Completa los campos obligatorios</p>
                      <p className="text-xs text-red-400/80 mt-0.5">
                        {Object.keys(formErrors).map(k => ({
                          name: 'Empresa', contact_person: 'Contacto', phone: 'Teléfono', email: 'Email'
                        }[k] || k)).join(' · ')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="name">Nombre de la Empresa <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => { setFormData({...formData, name: e.target.value}); clearFieldError('name') }}
                    placeholder="Nombre de la empresa"
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contact_person">Persona de Contacto <span className="text-red-500">*</span></Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => { setFormData({...formData, contact_person: e.target.value}); clearFieldError('contact_person') }}
                    placeholder="Nombre del contacto"
                    className={formErrors.contact_person ? 'border-red-500' : ''}
                  />
                  {formErrors.contact_person && <p className="text-red-500 text-xs">{formErrors.contact_person}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => { setFormData({...formData, phone: e.target.value}); clearFieldError('phone') }}
                      placeholder="Número de teléfono"
                      className={formErrors.phone ? 'border-red-500' : ''}
                    />
                    {formErrors.phone && <p className="text-red-500 text-xs">{formErrors.phone}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => { setFormData({...formData, email: e.target.value}); clearFieldError('email') }}
                      placeholder="correo@empresa.com"
                      className={formErrors.email ? 'border-red-500' : ''}
                    />
                    {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
                  </div>
                </div>

                <div className="space-y-1">
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
                  <Button type="button" variant="secondary" onClick={() => { setIsDialogOpen(false); setFormErrors({}) }}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim() || !formData.contact_person.trim() || !formData.phone.trim()}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando...' : 'Guardar Proveedor'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">Actualmente operando</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Realizadas</CardTitle>
            <Truck className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total de órdenes de compra</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Comprado</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">${(stats.totalAmount || 0).toLocaleString()}</div>
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
