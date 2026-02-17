'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package, Wrench, Box, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export type LineType = 'package' | 'free_service' | 'loose_product'

export interface WorkOrderServiceRow {
  id: string
  line_type: LineType
  service_package_id?: string | null
  name: string
  description?: string | null
  unit_price: number
  quantity: number
  total_price: number
  inventory_item_id?: string | null
  inventory_deducted?: boolean
  sort_order?: number
}

interface WorkOrderServicesProps {
  orderId: string
  onUpdate?: () => void
}

interface ServicePackage {
  id: string
  name: string
  description: string | null
  price: number
  service_package_items?: Array<{
    quantity: number
    inventory_item_id: string
    inventory?: { name: string; unit?: string; current_stock?: number } | null
  }>
}

function stockStatusForPackage(pkg: ServicePackage): { ok: boolean; text: string } {
  if (!pkg.service_package_items?.length) return { ok: true, text: 'Stock OK' }
  for (const it of pkg.service_package_items) {
    const req = Number(it.quantity) || 0
    const avail = Number(it.inventory?.current_stock ?? 0)
    if (avail < req) {
      return { ok: false, text: 'Stock insuficiente' }
    }
  }
  return { ok: true, text: 'Stock OK' }
}

export function WorkOrderServices({ orderId, onUpdate }: WorkOrderServicesProps) {
  const [services, setServices] = useState<WorkOrderServiceRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [inventory, setInventory] = useState<Array<{ id: string; name: string; current_stock?: number }>>([])
  const [modalPackage, setModalPackage] = useState(false)
  const [modalFree, setModalFree] = useState(false)
  const [modalProduct, setModalProduct] = useState(false)
  const [modalEdit, setModalEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingService, setEditingService] = useState<WorkOrderServiceRow | null>(null)

  const [formPackage, setFormPackage] = useState({ service_package_id: '', name: '', unit_price: 0, quantity: 1 })
  const [formFree, setFormFree] = useState({ name: '', unit_price: 0, quantity: 1, description: '' })
  const [formProduct, setFormProduct] = useState({ name: '', unit_price: 0, quantity: 1, inventory_item_id: '' as string | null })
  const [formEdit, setFormEdit] = useState({ name: '', unit_price: 0, quantity: 1, description: '' as string, inventory_item_id: '' as string | null })

  const loadServices = async () => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}/services`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setServices(json.data)
        setTotal(Number(json.total) || 0)
      } else {
        setServices([])
        setTotal(0)
      }
    } catch (e) {
      console.error(e)
      setServices([])
      setTotal(0)
    }
  }

  const lastLoadedOrderIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!orderId) return
    if (lastLoadedOrderIdRef.current === orderId) return
    lastLoadedOrderIdRef.current = orderId
    setLoading(true)
    loadServices().finally(() => setLoading(false))
  }, [orderId])

  const refresh = () => {
    loadServices()
    onUpdate?.()
  }

  const openPackageModal = async () => {
    setModalPackage(true)
    if (packages.length === 0) {
      try {
        const res = await fetch('/api/service-packages')
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) setPackages(json.data)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const openProductModal = async () => {
    setModalProduct(true)
    if (inventory.length === 0) {
      try {
        const res = await fetch('/api/inventory?pageSize=200')
        const json = await res.json()
        const list = json.data?.items ?? json.data ?? json.items ?? (Array.isArray(json) ? json : [])
        setInventory(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error(e)
      }
    }
  }

  const submitPackage = async () => {
    const pkg = packages.find(p => p.id === formPackage.service_package_id)
    if (!pkg) {
      toast.error('Selecciona un paquete')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/work-orders/${orderId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_type: 'package',
          service_package_id: pkg.id,
          name: formPackage.name || pkg.name,
          unit_price: formPackage.unit_price ?? pkg.price,
          quantity: formPackage.quantity || 1
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al agregar')
      if (json.warnings?.length) {
        toast.warning('Paquete agregado con stock insuficiente en algunos items')
      } else {
        toast.success('Paquete agregado')
      }
      setModalPackage(false)
      setFormPackage({ service_package_id: '', name: '', unit_price: 0, quantity: 1 })
      refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error al agregar paquete')
    } finally {
      setSaving(false)
    }
  }

  const submitFree = async () => {
    if (!formFree.name.trim()) {
      toast.error('Nombre requerido')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/work-orders/${orderId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_type: 'free_service',
          name: formFree.name.trim(),
          unit_price: formFree.unit_price ?? 0,
          quantity: formFree.quantity || 1,
          description: formFree.description?.trim() || undefined
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al agregar')
      toast.success('Servicio agregado')
      setModalFree(false)
      setFormFree({ name: '', unit_price: 0, quantity: 1, description: '' })
      refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error al agregar servicio')
    } finally {
      setSaving(false)
    }
  }

  const submitProduct = async () => {
    if (!formProduct.name.trim()) {
      toast.error('Nombre requerido')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/work-orders/${orderId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_type: 'loose_product',
          name: formProduct.name.trim(),
          unit_price: formProduct.unit_price ?? 0,
          quantity: formProduct.quantity || 1,
          inventory_item_id: formProduct.inventory_item_id || null
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al agregar')
      toast.success('Producto agregado')
      setModalProduct(false)
      setFormProduct({ name: '', unit_price: 0, quantity: 1, inventory_item_id: null })
      refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error al agregar producto')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row: WorkOrderServiceRow) => {
    setEditingService(row)
    setFormEdit({
      name: row.name,
      unit_price: row.unit_price,
      quantity: row.quantity,
      description: row.description ?? '',
      inventory_item_id: row.inventory_item_id ?? null
    })
    setModalEdit(true)
  }

  const submitEdit = async () => {
    if (!editingService) return
    setSaving(true)
    try {
      const res = await fetch(`/api/work-orders/${orderId}/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formEdit.name.trim(),
          unit_price: formEdit.unit_price,
          quantity: formEdit.quantity,
          description: formEdit.description || null,
          inventory_item_id: formEdit.inventory_item_id || null
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al actualizar')
      toast.success('Servicio actualizado')
      setModalEdit(false)
      setEditingService(null)
      refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}/services/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al eliminar')
      toast.success('Servicio eliminado')
      refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  const getPackageStockStatus = (service: WorkOrderServiceRow) => {
    if (service.line_type !== 'package' || !service.service_package_id) return null
    const pkg = packages.find(p => p.id === service.service_package_id)
    return pkg ? stockStatusForPackage(pkg) : null
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-lg">Servicios y conceptos</h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openPackageModal}>
            <Package className="h-4 w-4 mr-2" />
            + Paquete
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setModalFree(true)}>
            <Wrench className="h-4 w-4 mr-2" />
            + Servicio
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openProductModal}>
            <Box className="h-4 w-4 mr-2" />
            + Producto
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay servicios agregados. Usa los botones de arriba para agregar paquetes, servicios o productos.
            </CardContent>
          </Card>
        ) : (
          services.map((svc) => {
            const stockStatus = getPackageStockStatus(svc)
            return (
              <Card key={svc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {svc.line_type === 'package' && <Package className="h-4 w-4 text-primary shrink-0" />}
                    {svc.line_type === 'free_service' && <Wrench className="h-4 w-4 text-primary shrink-0" />}
                    {svc.line_type === 'loose_product' && <Box className="h-4 w-4 text-primary shrink-0" />}
                    <span className="font-medium truncate">{svc.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatMoney(Number(svc.total_price))}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {svc.line_type === 'package' && stockStatus && (
                      <span className={stockStatus.ok ? 'text-green-600' : 'text-red-600'}>
                        {stockStatus.text}
                      </span>
                    )}
                    {svc.line_type === 'free_service' && (svc.description ? svc.description : 'Solo mano de obra')}
                    {svc.line_type === 'loose_product' && (svc.description || '')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(svc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('¿Eliminar este concepto?')) deleteService(svc.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {services.length > 0 && (
        <div className="flex justify-end border-t pt-4">
          <p className="text-lg font-semibold">
            Total estimado: {formatMoney(total)}
          </p>
        </div>
      )}

      {/* Modal + Paquete */}
      <Dialog open={modalPackage} onOpenChange={setModalPackage}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Agregar paquete</DialogTitle>
            <DialogDescription className="text-slate-300">Elige un paquete predefinido de la organización.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Paquete</Label>
              <Select
                value={formPackage.service_package_id}
                onValueChange={(v) => {
                  const p = packages.find(x => x.id === v)
                  setFormPackage(prev => ({
                    ...prev,
                    service_package_id: v,
                    name: p?.name ?? prev.name,
                    unit_price: p?.price ?? prev.unit_price
                  }))
                }}
              >
                <SelectTrigger className="bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700/80">
                  <SelectValue placeholder="Seleccionar paquete" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-600 text-white">
                  {packages.map((p) => {
                    const st = stockStatusForPackage(p)
                    return (
                      <SelectItem key={p.id} value={p.id} className="text-white focus:bg-slate-700 focus:text-white">
                        <span className="flex items-center gap-2">
                          {p.name} – {formatMoney(p.price)}
                          {!st.ok && <span className="text-red-400 text-xs">(stock bajo)</span>}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-200">Nombre (opcional)</Label>
              <Input
                className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-400"
                value={formPackage.name}
                onChange={(e) => setFormPackage(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Se usa el nombre del paquete si se deja vacío"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-200">Precio unitario</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="bg-slate-800/80 border-slate-600 text-white"
                  value={formPackage.unit_price || ''}
                  onChange={(e) => setFormPackage(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-slate-200">Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  className="bg-slate-800/80 border-slate-600 text-white"
                  value={formPackage.quantity}
                  onChange={(e) => setFormPackage(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800" onClick={() => setModalPackage(false)}>Cancelar</Button>
              <Button onClick={submitPackage} disabled={saving || !formPackage.service_package_id}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal + Servicio libre */}
      <Dialog open={modalFree} onOpenChange={setModalFree}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar servicio libre</DialogTitle>
            <DialogDescription>Servicio o mano de obra sin relación con inventario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={formFree.name}
                onChange={(e) => setFormFree(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Revisión de frenos"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={formFree.description}
                onChange={(e) => setFormFree(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalle del trabajo"
                rows={2}
                className="bg-slate-950 text-slate-100 border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio unitario</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formFree.unit_price || ''}
                  onChange={(e) => setFormFree(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={formFree.quantity}
                  onChange={(e) => setFormFree(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalFree(false)}>Cancelar</Button>
              <Button onClick={submitFree} disabled={saving || !formFree.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal + Producto suelto */}
      <Dialog open={modalProduct} onOpenChange={setModalProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar producto suelto</DialogTitle>
            <DialogDescription>Concepto de producto; opcionalmente vinculado a inventario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Producto del inventario (opcional)</Label>
              <Select
                value={formProduct.inventory_item_id || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setFormProduct(prev => ({ ...prev, inventory_item_id: null, name: prev.name }))
                    return
                  }
                  const inv = inventory.find(i => i.id === v)
                  setFormProduct(prev => ({
                    ...prev,
                    inventory_item_id: v,
                    name: inv?.name ?? prev.name
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno / escribir nombre libre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno (nombre libre)</SelectItem>
                  {inventory.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre</Label>
              <Input
                value={formProduct.name}
                onChange={(e) => setFormProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Bomba de agua"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio unitario</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formProduct.unit_price || ''}
                  onChange={(e) => setFormProduct(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={formProduct.quantity}
                  onChange={(e) => setFormProduct(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalProduct(false)}>Cancelar</Button>
              <Button onClick={submitProduct} disabled={saving || !formProduct.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={modalEdit} onOpenChange={(open) => { if (!open) setEditingService(null); setModalEdit(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar concepto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={formEdit.name}
                onChange={(e) => setFormEdit(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            {editingService?.line_type === 'free_service' && (
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formEdit.description}
                  onChange={(e) => setFormEdit(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="bg-slate-950 text-slate-100 border-slate-700"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio unitario</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formEdit.unit_price ?? ''}
                  onChange={(e) => setFormEdit(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={formEdit.quantity}
                  onChange={(e) => setFormEdit(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalEdit(false)}>Cancelar</Button>
              <Button onClick={submitEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
