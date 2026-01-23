'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomers } from '@/hooks/useCustomers'
import { useOrganization } from '@/lib/context/SessionContext'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  User, 
  Droplet, 
  Fuel, 
  Wrench, 
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Loader2,
  Edit
} from 'lucide-react'

interface WorkOrderGeneralFormProps {
  order: any
  isEditing: boolean
  onEditChange: (editing: boolean) => void
  onSave: () => void
}

export function WorkOrderGeneralForm({
  order,
  isEditing,
  onEditChange,
  onSave
}: WorkOrderGeneralFormProps) {
  const { organizationId } = useOrganization()
  const { customers } = useCustomers()
  const supabase = createClient()
  
  const [isSaving, setIsSaving] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  
  // ✅ Estados para todos los campos editables (replicando CreateWorkOrderModal)
  const [formData, setFormData] = useState({
    // Cliente
    customerName: order?.customer?.name || '',
    customerPhone: order?.customer?.phone || '',
    customerEmail: order?.customer?.email || '',
    customerAddress: order?.customer?.address || '',
    
    // Vehículo
    vehicleBrand: order?.vehicle?.brand || '',
    vehicleModel: order?.vehicle?.model || '',
    vehicleYear: order?.vehicle?.year?.toString() || '',
    vehiclePlate: order?.vehicle?.license_plate || '',
    vehicleColor: order?.vehicle?.color || '',
    vehicleMileage: order?.vehicle?.mileage?.toString() || '',
    
    // Orden
    description: order?.description || '',
    estimated_cost: order?.estimated_cost?.toString() || '',
    assigned_to: (order as any)?.assigned_user?.id || order?.assigned_to || '',
    
    // Inspección (desde inspection si existe)
    fluids: {
      aceite_motor: false,
      aceite_transmision: false,
      liquido_frenos: false,
      liquido_embrague: false,
      refrigerante: false,
      aceite_hidraulico: false,
      limpia_parabrisas: false,
    },
    fuel_level: 'half',
    valuable_items: '',
    will_diagnose: false,
    entry_reason: '',
    procedures: '',
    is_warranty: false,
    authorize_test_drive: false,
  })

  // ✅ Filtrar clientes por búsqueda
  const filteredCustomers = useMemo(() => {
    if (!formData.customerName || formData.customerName.length < 2) {
      return customers.slice(0, 5)
    }
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(formData.customerName.toLowerCase()) ||
        c.phone?.includes(formData.customerName)
      )
      .slice(0, 5)
  }, [customers, formData.customerName])

  // ✅ Cargar empleados asignables
  useEffect(() => {
    const loadEmployees = async () => {
      if (!organizationId) return
      
      try {
        setLoadingEmployees(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const { data: mechanics, error } = await supabase
          .from('users')
          .select('id, full_name, email, role, workshop_id, organization_id, is_active')
          .eq('organization_id', organizationId)
          .in('role', ['MECANICO', 'ASESOR'])
          .eq('is_active', true)
          .order('full_name', { ascending: true })
        
        if (error) throw error
        setEmployees(mechanics || [])
      } catch (error) {
        console.error('Error cargando empleados:', error)
      } finally {
        setLoadingEmployees(false)
      }
    }
    
    loadEmployees()
  }, [organizationId, supabase])
  
  // ✅ SINCRONIZAR ESTADO CON LA PROPIEDAD order cuando cambia
  useEffect(() => {
    if (order) {
      const inspection = (order as any).inspection
      
      setFormData({
        // Cliente
        customerName: order.customer?.name || '',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || '',
        customerAddress: order.customer?.address || '',
        
        // Vehículo
        vehicleBrand: order.vehicle?.brand || '',
        vehicleModel: order.vehicle?.model || '',
        vehicleYear: order.vehicle?.year?.toString() || '',
        vehiclePlate: order.vehicle?.license_plate || '',
        vehicleColor: order.vehicle?.color || '',
        vehicleMileage: order.vehicle?.mileage?.toString() || '',
        
        // Orden
        description: order.description || '',
        estimated_cost: order.estimated_cost?.toString() || '',
        assigned_to: (order as any)?.assigned_user?.id || order?.assigned_to || '',
        
        // Inspección
        fluids: inspection?.fluids_check || {
          aceite_motor: false,
          aceite_transmision: false,
          liquido_frenos: false,
          liquido_embrague: false,
          refrigerante: false,
          aceite_hidraulico: false,
          limpia_parabrisas: false,
        },
        fuel_level: inspection?.fuel_level || 'half',
        valuable_items: inspection?.valuable_items || '',
        will_diagnose: inspection?.will_diagnose || false,
        entry_reason: inspection?.entry_reason || '',
        procedures: inspection?.procedures || '',
        is_warranty: inspection?.is_warranty || false,
        authorize_test_drive: inspection?.authorize_test_drive || false,
      })
    }
  }, [order])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Actualizar orden
      const orderUpdate: any = {
        description: formData.description,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      }
      
      if (formData.assigned_to) {
        orderUpdate.assigned_to = formData.assigned_to
      }
      
      const orderResponse = await fetch(`/api/work-orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderUpdate),
        credentials: 'include'
      })
      
      if (!orderResponse.ok) {
        const error = await orderResponse.json()
        throw new Error(error.error || 'Error al actualizar orden')
      }
      
      // Actualizar inspección (crear o actualizar)
      const inspectionData = {
        order_id: order.id,
        organization_id: organizationId,
        fluids_check: formData.fluids,
        fuel_level: formData.fuel_level,
        valuable_items: formData.valuable_items || null,
        will_diagnose: formData.will_diagnose,
        entry_reason: formData.entry_reason || null,
        procedures: formData.procedures || null,
        is_warranty: formData.is_warranty,
        authorize_test_drive: formData.authorize_test_drive,
      }
      
      // Verificar si existe inspección
      const { data: existingInspection } = await supabase
        .from('vehicle_inspections')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle()
      
      if (existingInspection) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('vehicle_inspections')
          .update(inspectionData)
          .eq('id', existingInspection.id)
        
        if (updateError) throw updateError
      } else {
        // Crear
        const { error: insertError } = await supabase
          .from('vehicle_inspections')
          .insert(inspectionData)
        
        if (insertError) throw insertError
      }
      
      toast.success('Orden actualizada exitosamente')
      onEditChange(false)
      onSave()
    } catch (error: any) {
      toast.error('Error al actualizar orden', {
        description: error.message
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const processedValue = name === 'vehiclePlate' ? value.toUpperCase() : value
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
  }

  if (!order) return null

  return (
    <div className="space-y-6">
      {/* Botón Editar/Guardar */}
      <div className="flex justify-end gap-2">
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditChange(true)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEditChange(false)
                // Resetear formData a valores originales
                const inspection = (order as any).inspection
                setFormData({
                  customerName: order.customer?.name || '',
                  customerPhone: order.customer?.phone || '',
                  customerEmail: order.customer?.email || '',
                  customerAddress: order.customer?.address || '',
                  vehicleBrand: order.vehicle?.brand || '',
                  vehicleModel: order.vehicle?.model || '',
                  vehicleYear: order.vehicle?.year?.toString() || '',
                  vehiclePlate: order.vehicle?.license_plate || '',
                  vehicleColor: order.vehicle?.color || '',
                  vehicleMileage: order.vehicle?.mileage?.toString() || '',
                  description: order.description || '',
                  estimated_cost: order.estimated_cost?.toString() || '',
                  assigned_to: (order as any)?.assigned_user?.id || order?.assigned_to || '',
                  fluids: inspection?.fluids_check || {
                    aceite_motor: false,
                    aceite_transmision: false,
                    liquido_frenos: false,
                    liquido_embrague: false,
                    refrigerante: false,
                    aceite_hidraulico: false,
                    limpia_parabrisas: false,
                  },
                  fuel_level: inspection?.fuel_level || 'half',
                  valuable_items: inspection?.valuable_items || '',
                  will_diagnose: inspection?.will_diagnose || false,
                  entry_reason: inspection?.entry_reason || '',
                  procedures: inspection?.procedures || '',
                  is_warranty: inspection?.is_warranty || false,
                  authorize_test_drive: inspection?.authorize_test_drive || false,
                })
              }}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Datos del Cliente */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm border-b pb-2">
          Datos del Cliente
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Label htmlFor="customer_name">Nombre *</Label>
            {isEditing ? (
              <>
                <div className="relative">
                  <Input
                    id="customer_name"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    placeholder="Escribe o selecciona un cliente"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
                  >
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            customerName: customer.name,
                            customerPhone: customer.phone || '',
                            customerEmail: customer.email || '',
                            customerAddress: customer.address || ''
                          }))
                          setShowCustomerDropdown(false)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center gap-3 border-b border-gray-800 last:border-0"
                      >
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{customer.name}</p>
                          <p className="text-xs text-gray-400 truncate">{customer.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{formData.customerName || 'N/A'}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="customer_phone">Teléfono *</Label>
            {isEditing ? (
              <div className="relative">
                <Input
                  id="customer_phone"
                  name="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  placeholder="4491234567"
                  maxLength={10}
                  className="pr-10"
                />
                {formData.customerPhone && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{formData.customerPhone || 'N/A'}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="customer_email">Email (opcional)</Label>
          {isEditing ? (
            <div className="relative">
              <Input
                id="customer_email"
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="cliente@ejemplo.com"
                className="pr-10"
              />
              {formData.customerEmail && (
                <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{formData.customerEmail || 'N/A'}</p>
          )}
        </div>
      </div>

      {/* Datos del Vehículo */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm border-b pb-2">
          Datos del Vehículo
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehicle_brand">Marca *</Label>
            {isEditing ? (
              <Input
                id="vehicle_brand"
                name="vehicleBrand"
                value={formData.vehicleBrand}
                onChange={handleChange}
                placeholder="Toyota, Honda..."
              />
            ) : (
              <p className="text-sm text-muted-foreground">{formData.vehicleBrand || 'N/A'}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="vehicle_model">Modelo *</Label>
            {isEditing ? (
              <Input
                id="vehicle_model"
                name="vehicleModel"
                value={formData.vehicleModel}
                onChange={handleChange}
                placeholder="Corolla, Civic..."
              />
            ) : (
              <p className="text-sm text-muted-foreground">{formData.vehicleModel || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="vehicle_year">Año *</Label>
            {isEditing ? (
              <div className="relative">
                <Input
                  id="vehicle_year"
                  name="vehicleYear"
                  type="number"
                  value={formData.vehicleYear}
                  onChange={handleChange}
                  placeholder="2020"
                  className="pr-10"
                />
                {formData.vehicleYear && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{formData.vehicleYear || 'N/A'}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="vehicle_plate">Placa *</Label>
            {isEditing ? (
              <Input
                id="vehicle_plate"
                name="vehiclePlate"
                value={formData.vehiclePlate}
                onChange={handleChange}
                placeholder="ABC-123-D"
                className="uppercase"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{formData.vehiclePlate || 'N/A'}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="vehicle_color">Color</Label>
            {isEditing ? (
              <Input
                id="vehicle_color"
                name="vehicleColor"
                value={formData.vehicleColor}
                onChange={handleChange}
                placeholder="Blanco..."
              />
            ) : (
              <p className="text-sm text-muted-foreground">{formData.vehicleColor || 'N/A'}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="mileage">Kilometraje</Label>
          {isEditing ? (
            <div className="relative">
              <Input
                id="mileage"
                name="vehicleMileage"
                type="number"
                value={formData.vehicleMileage}
                onChange={handleChange}
                placeholder="50000"
                className="pr-10"
              />
              {formData.vehicleMileage && (
                <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{formData.vehicleMileage || 'N/A'}</p>
          )}
        </div>
      </div>

      {/* Descripción del Trabajo */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm border-b pb-2">
          Descripción del Trabajo
        </h3>
        {isEditing ? (
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descripción del trabajo a realizar..."
            rows={3}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{formData.description || 'Sin descripción'}</p>
        )}
      </div>

      {/* Inspección del Vehículo */}
      <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
        <h3 className="font-semibold text-sm border-b border-slate-700 pb-2 flex items-center gap-2 text-slate-300">
          <Wrench className="h-4 w-4" />
          Inspección del Vehículo
        </h3>

        {/* Nivel de combustible */}
        <div>
          <Label className="flex items-center gap-2 mb-2 text-slate-300">
            <Fuel className="h-4 w-4 text-yellow-500" />
            Nivel de combustible
          </Label>
          {isEditing ? (
            <div className="flex gap-2">
              {[
                { value: 'empty', label: 'Vacío', color: 'bg-red-500' },
                { value: 'quarter', label: '1/4', color: 'bg-orange-500' },
                { value: 'half', label: '1/2', color: 'bg-yellow-500' },
                { value: 'three_quarters', label: '3/4', color: 'bg-lime-500' },
                { value: 'full', label: 'Lleno', color: 'bg-green-500' },
              ].map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, fuel_level: level.value })}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.fuel_level === level.value
                      ? `${level.color} text-white shadow-lg`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {formData.fuel_level === 'empty' ? 'Vacío' :
               formData.fuel_level === 'quarter' ? '1/4' :
               formData.fuel_level === 'half' ? '1/2' :
               formData.fuel_level === 'three_quarters' ? '3/4' :
               formData.fuel_level === 'full' ? 'Lleno' : 'N/A'}
            </p>
          )}
        </div>

        {/* Checklist de fluidos */}
        <div>
          <Label className="flex items-center gap-2 mb-3 text-slate-300">
            <Droplet className="h-4 w-4 text-blue-500" />
            Fluidos verificados
          </Label>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'aceite_motor', label: 'Aceite de motor' },
                { key: 'aceite_transmision', label: 'Aceite de transmisión' },
                { key: 'liquido_frenos', label: 'Líquido de frenos' },
                { key: 'liquido_embrague', label: 'Líquido de embrague' },
                { key: 'refrigerante', label: 'Refrigerante' },
                { key: 'aceite_hidraulico', label: 'Aceite hidráulico' },
                { key: 'limpia_parabrisas', label: 'Limpia parabrisas' },
              ].map((fluid) => (
                <label
                  key={fluid.key}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={formData.fluids[fluid.key as keyof typeof formData.fluids]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fluids: { ...formData.fluids, [fluid.key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-300">{fluid.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(formData.fluids).map(([key, checked]) => {
                const labels: Record<string, string> = {
                  aceite_motor: 'Aceite de motor',
                  aceite_transmision: 'Aceite de transmisión',
                  liquido_frenos: 'Líquido de frenos',
                  liquido_embrague: 'Líquido de embrague',
                  refrigerante: 'Refrigerante',
                  aceite_hidraulico: 'Aceite hidráulico',
                  limpia_parabrisas: 'Limpia parabrisas',
                }
                return checked ? (
                  <p key={key} className="text-sm text-muted-foreground">✓ {labels[key]}</p>
                ) : null
              })}
            </div>
          )}
        </div>

        {/* Objetos de valor */}
        <div>
          <Label htmlFor="valuable_items" className="text-slate-300">Objetos de valor reportados</Label>
          {isEditing ? (
            <Textarea
              id="valuable_items"
              value={formData.valuable_items}
              onChange={(e) => setFormData({ ...formData, valuable_items: e.target.value })}
              rows={2}
              placeholder="Ej: Estéreo, GPS, herramientas en cajuela..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{formData.valuable_items || 'Ninguno reportado'}</p>
          )}
        </div>
      </div>

      {/* Motivo de Ingreso */}
      <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
        <h3 className="font-semibold text-sm border-b border-slate-700 pb-2 flex items-center gap-2 text-slate-300">
          <Wrench className="h-4 w-4" />
          Motivo de Ingreso
        </h3>

        {/* Toggles */}
        <div className="grid grid-cols-3 gap-3">
          <label className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
            <span className="text-sm text-slate-300">¿Diagnóstico?</span>
            {isEditing ? (
              <input
                type="checkbox"
                checked={formData.will_diagnose}
                onChange={(e) => setFormData({ ...formData, will_diagnose: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            ) : (
              <span className="text-sm text-muted-foreground">{formData.will_diagnose ? 'Sí' : 'No'}</span>
            )}
          </label>

          <label className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
            <span className="text-sm text-slate-300">¿Garantía?</span>
            {isEditing ? (
              <input
                type="checkbox"
                checked={formData.is_warranty}
                onChange={(e) => setFormData({ ...formData, is_warranty: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            ) : (
              <span className="text-sm text-muted-foreground">{formData.is_warranty ? 'Sí' : 'No'}</span>
            )}
          </label>

          <label className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
            <span className="text-sm text-slate-300">¿Prueba de ruta?</span>
            {isEditing ? (
              <input
                type="checkbox"
                checked={formData.authorize_test_drive}
                onChange={(e) => setFormData({ ...formData, authorize_test_drive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            ) : (
              <span className="text-sm text-muted-foreground">{formData.authorize_test_drive ? 'Sí' : 'No'}</span>
            )}
          </label>
        </div>

        {/* Motivo */}
        <div>
          <Label htmlFor="entry_reason" className="text-slate-300">Motivo de ingreso</Label>
          {isEditing ? (
            <Textarea
              id="entry_reason"
              value={formData.entry_reason}
              onChange={(e) => setFormData({ ...formData, entry_reason: e.target.value })}
              rows={2}
              placeholder="Ej: Cliente reporta ruido en motor, falla en arranque..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{formData.entry_reason || 'No especificado'}</p>
          )}
        </div>

        {/* Procedimientos */}
        <div>
          <Label htmlFor="procedures" className="text-slate-300">Procedimientos a realizar</Label>
          {isEditing ? (
            <Textarea
              id="procedures"
              value={formData.procedures}
              onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}
              rows={2}
              placeholder="Ej: Revisión completa de motor, cambio de bujías..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{formData.procedures || 'No especificado'}</p>
          )}
        </div>
      </div>

      {/* Costo Estimado */}
      <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
        <div>
          <Label htmlFor="estimated_cost" className="text-slate-300">
            Costo Estimado (MXN) <span className="text-slate-500 text-xs">(Opcional)</span>
          </Label>
          {isEditing ? (
            <div className="relative">
              <Input
                id="estimated_cost"
                name="estimated_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimated_cost}
                onChange={handleChange}
                placeholder="0.00"
                className="pr-10"
              />
              {formData.estimated_cost && (
                <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ${formData.estimated_cost ? parseFloat(formData.estimated_cost).toFixed(2) : '0.00'}
            </p>
          )}
        </div>
      </div>

      {/* Asignar Empleado */}
      <div className="space-y-4">
        <Label htmlFor="assigned_to">Asignar Empleado (opcional)</Label>
        {isEditing ? (
          <Select
            name="assigned_to"
            value={formData.assigned_to && formData.assigned_to !== '' ? formData.assigned_to : 'none'}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, assigned_to: value === 'none' ? '' : value }))
            }}
            disabled={loadingEmployees}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar empleado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.role === 'MECANICO' ? 'Mecánico' : 'Asesor'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            {(order as any)?.assigned_user?.full_name || 'Sin asignar'}
          </p>
        )}
      </div>
    </div>
  )
}

