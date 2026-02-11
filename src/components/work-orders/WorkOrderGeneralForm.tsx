'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  
  // ✅ Función helper para inicializar formData desde order
  const initializeFormData = (orderData: any) => {
    if (!orderData) {
      console.warn('⚠️ [WorkOrderGeneralForm] orderData es null/undefined')
      return {
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleYear: '',
        vehiclePlate: '',
        vehicleColor: '',
        vehicleMileage: '',
        description: '',
        estimated_cost: '',
        assigned_to: '',
        status: 'reception',
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
      }
    }

    // ✅ Mejorar acceso a inspection
    const inspection = orderData.inspection || 
                      (orderData.vehicle_inspections && Array.isArray(orderData.vehicle_inspections) 
                        ? orderData.vehicle_inspections[0] 
                        : null) ||
                      null
    
    if (inspection) {
      console.log('✅ [WorkOrderGeneralForm] Inspection encontrada:', {
        id: inspection.id,
        order_id: inspection.order_id,
        fluids_check: inspection.fluids_check,
        fuel_level: inspection.fuel_level,
        valuable_items: inspection.valuable_items,
        will_diagnose: inspection.will_diagnose,
        entry_reason: inspection.entry_reason,
        procedures: inspection.procedures,
        is_warranty: inspection.is_warranty,
        authorize_test_drive: inspection.authorize_test_drive,
      })
    } else {
      console.warn('⚠️ [WorkOrderGeneralForm] No se encontró inspection en orderData')
    }
    
    // ✅ Mapear fluids_check correctamente
    const fluidsCheck = inspection?.fluids_check || {}
    const fluids = {
      aceite_motor: fluidsCheck.aceite_motor || false,
      aceite_transmision: fluidsCheck.aceite_transmision || false,
      liquido_frenos: fluidsCheck.liquido_frenos || false,
      liquido_embrague: fluidsCheck.liquido_embrague || false,
      refrigerante: fluidsCheck.refrigerante || false,
      aceite_hidraulico: fluidsCheck.aceite_hidraulico || false,
      limpia_parabrisas: fluidsCheck.limpia_parabrisas || false,
    }

    const formData = {
      // Cliente
      customerName: orderData.customer?.name || '',
      customerPhone: orderData.customer?.phone || '',
      customerEmail: orderData.customer?.email || '',
      customerAddress: orderData.customer?.address || '',
      
      // Vehículo
      vehicleBrand: orderData.vehicle?.brand || '',
      vehicleModel: orderData.vehicle?.model || '',
      vehicleYear: orderData.vehicle?.year?.toString() || '',
      vehiclePlate: orderData.vehicle?.license_plate || '',
      vehicleColor: orderData.vehicle?.color || '',
      vehicleMileage: orderData.vehicle?.mileage?.toString() || '',
      
      // Orden
      description: orderData.description || '',
      estimated_cost: orderData.estimated_cost ? orderData.estimated_cost.toString() : '',
      assigned_to: orderData.assigned_user?.id || orderData.assigned_to || '',
      status: orderData.status || 'reception',
      
      // Inspección
      fluids,
      fuel_level: inspection?.fuel_level || 'half',
      valuable_items: inspection?.valuable_items || '',
      will_diagnose: inspection?.will_diagnose || false,
      entry_reason: inspection?.entry_reason || '',
      procedures: inspection?.procedures || '',
      is_warranty: inspection?.is_warranty || false,
      authorize_test_drive: inspection?.authorize_test_drive || false,
    }

    // ✅ DEBUG: Log de campos vacíos con detalles
    const emptyFields = Object.entries(formData)
      .filter(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return Object.values(value).every(v => !v)
        }
        return !value || value === ''
      })
      .map(([key, value]) => ({ key, value }))
    
    if (emptyFields.length > 0) {
      console.log('📝 [WorkOrderGeneralForm] Campos vacíos encontrados:', emptyFields.map(f => f.key))
      console.log('📝 [WorkOrderGeneralForm] Detalles de campos vacíos:', emptyFields)
    }
    
    // ✅ DEBUG: Log de campos con datos
    const fieldsWithData = Object.entries(formData)
      .filter(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return Object.values(value).some(v => !!v)
        }
        return !!value && value !== ''
      })
      .map(([key, value]) => ({ key, value }))
    
    console.log('✅ [WorkOrderGeneralForm] Campos con datos:', fieldsWithData.map(f => f.key))

    return formData
  }

  // ✅ Estados para todos los campos editables (replicando CreateWorkOrderModal)
  const [formData, setFormData] = useState(() => initializeFormData(order))

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
      // ✅ DEBUG: Log para verificar qué datos estamos recibiendo
      console.log('🔍 [WorkOrderGeneralForm] Order recibida:', {
        id: order.id,
        hasCustomer: !!order.customer,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
          address: order.customer.address,
        } : null,
        hasVehicle: !!order.vehicle,
        vehicle: order.vehicle ? {
          id: order.vehicle.id,
          brand: order.vehicle.brand,
          model: order.vehicle.model,
          year: order.vehicle.year,
          license_plate: order.vehicle.license_plate,
          color: order.vehicle.color,
          mileage: order.vehicle.mileage,
        } : null,
        hasInspection: !!(order as any).inspection,
        inspection: (order as any).inspection ? {
          id: (order as any).inspection.id,
          fluids_check: (order as any).inspection.fluids_check,
          fuel_level: (order as any).inspection.fuel_level,
          valuable_items: (order as any).inspection.valuable_items,
          entry_reason: (order as any).inspection.entry_reason,
          procedures: (order as any).inspection.procedures,
        } : null,
        hasVehicleInspections: !!(order as any).vehicle_inspections,
        vehicle_inspections: (order as any).vehicle_inspections,
        description: order.description,
        estimated_cost: order.estimated_cost,
        assigned_to: order.assigned_to,
        assigned_user: (order as any).assigned_user ? {
          id: (order as any).assigned_user.id,
          full_name: (order as any).assigned_user.full_name,
        } : null,
      })
      
      // ✅ Usar la función helper para inicializar formData consistentemente
      const initializedData = initializeFormData(order)
      console.log('📋 [WorkOrderGeneralForm] FormData inicializado:', initializedData)
      setFormData(initializedData)
    }
  }, [order])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 1. Actualizar orden
      const orderUpdate: any = {
        description: formData.description,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        status: formData.status,
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

      // 2. Actualizar vehículo (placa, marca, modelo, año, color, km)
      if (order.vehicle_id) {
        const vehicleUpdate: Record<string, unknown> = {}
        if (formData.vehicleBrand)   vehicleUpdate.brand = formData.vehicleBrand
        if (formData.vehicleModel)   vehicleUpdate.model = formData.vehicleModel
        if (formData.vehicleYear)    vehicleUpdate.year = parseInt(formData.vehicleYear) || null
        if (formData.vehiclePlate)   vehicleUpdate.license_plate = formData.vehiclePlate.toUpperCase()
        if (formData.vehicleColor !== undefined) vehicleUpdate.color = formData.vehicleColor || null
        if (formData.vehicleMileage) vehicleUpdate.mileage = parseInt(formData.vehicleMileage) || null

        if (Object.keys(vehicleUpdate).length > 0) {
          const { error: vehicleError } = await supabase
            .from('vehicles')
            .update(vehicleUpdate)
            .eq('id', order.vehicle_id)

          if (vehicleError) {
            console.error('[WorkOrderGeneralForm] Error actualizando vehículo:', vehicleError)
            toast.error('Error al actualizar datos del vehículo', { description: vehicleError.message })
          }
        }
      }

      // 3. Actualizar cliente (nombre, teléfono, email, dirección)
      if (order.customer_id) {
        const customerUpdate: Record<string, unknown> = {}
        if (formData.customerName)  customerUpdate.name = formData.customerName
        if (formData.customerPhone) customerUpdate.phone = formData.customerPhone
        if (formData.customerEmail) customerUpdate.email = formData.customerEmail
        if (formData.customerAddress !== undefined) customerUpdate.address = formData.customerAddress || null

        if (Object.keys(customerUpdate).length > 0) {
          const { error: customerError } = await supabase
            .from('customers')
            .update(customerUpdate)
            .eq('id', order.customer_id)

          if (customerError) {
            console.error('[WorkOrderGeneralForm] Error actualizando cliente:', customerError)
            toast.error('Error al actualizar datos del cliente', { description: customerError.message })
          }
        }
      }
      
      // 4. Actualizar inspección (crear o actualizar)
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
                // ✅ Resetear formData a valores originales usando la función helper
                setFormData(initializeFormData(order))
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

      {/* Estado y Asignación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estado de la Orden */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado de la Orden</Label>
          {isEditing ? (
            <Select
              name="status"
              value={formData.status}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, status: value }))
              }}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white hover:bg-slate-800 focus:bg-primary/25 w-full">
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="reception" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Recepción
                </SelectItem>
                <SelectItem value="diagnosis" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Diagnóstico
                </SelectItem>
                <SelectItem value="initial_quote" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Cotización
                </SelectItem>
                <SelectItem value="waiting_approval" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Esperando Aprobación
                </SelectItem>
                <SelectItem value="disassembly" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Desarmado
                </SelectItem>
                <SelectItem value="waiting_parts" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Esperando Piezas
                </SelectItem>
                <SelectItem value="assembly" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Armado
                </SelectItem>
                <SelectItem value="testing" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Pruebas
                </SelectItem>
                <SelectItem value="ready" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Listo
                </SelectItem>
                <SelectItem value="completed" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Completado
                </SelectItem>
                <SelectItem value="cancelled" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Cancelado
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Badge className={`${
                formData.status === 'reception' ? 'bg-gray-500' :
                formData.status === 'diagnosis' ? 'bg-purple-500' :
                formData.status === 'initial_quote' ? 'bg-blue-500' :
                formData.status === 'waiting_approval' ? 'bg-yellow-500' :
                formData.status === 'disassembly' ? 'bg-orange-500' :
                formData.status === 'waiting_parts' ? 'bg-amber-500' :
                formData.status === 'assembly' ? 'bg-indigo-500' :
                formData.status === 'testing' ? 'bg-cyan-500' :
                formData.status === 'ready' ? 'bg-green-500' :
                formData.status === 'completed' ? 'bg-emerald-500' :
                formData.status === 'cancelled' ? 'bg-red-500' :
                'bg-gray-500'
              } text-white`}>
                {formData.status === 'reception' ? 'Recepción' :
                 formData.status === 'diagnosis' ? 'Diagnóstico' :
                 formData.status === 'initial_quote' ? 'Cotización' :
                 formData.status === 'waiting_approval' ? 'Esperando Aprobación' :
                 formData.status === 'disassembly' ? 'Desarmado' :
                 formData.status === 'waiting_parts' ? 'Esperando Piezas' :
                 formData.status === 'assembly' ? 'Armado' :
                 formData.status === 'testing' ? 'Pruebas' :
                 formData.status === 'ready' ? 'Listo' :
                 formData.status === 'completed' ? 'Completado' :
                 formData.status === 'cancelled' ? 'Cancelado' :
                 formData.status}
              </Badge>
            </div>
          )}
        </div>

        {/* Asignar o Reasignar Empleado */}
        <div className="space-y-2">
          <Label htmlFor="assigned_to">Asignar o Reasignar Empleado</Label>
          {isEditing ? (
            <Select
              name="assigned_to"
              value={formData.assigned_to && formData.assigned_to !== '' ? formData.assigned_to : 'none'}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, assigned_to: value === 'none' ? '' : value }))
              }}
              disabled={loadingEmployees}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white hover:bg-slate-800 focus:bg-primary/25 w-full">
                <SelectValue placeholder="Seleccionar empleado..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="none" className="hover:bg-slate-800 focus:bg-slate-800 text-white">
                  Sin asignar
                </SelectItem>
                {employees.map((employee) => (
                  <SelectItem 
                    key={employee.id} 
                    value={employee.id}
                    className="hover:bg-slate-800 focus:bg-slate-800 text-white"
                  >
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
    </div>
  )
}

