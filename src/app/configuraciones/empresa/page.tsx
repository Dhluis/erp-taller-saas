"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CreditCard,
  Users,
  Settings,
  Save,
  Upload,
  Camera
} from "lucide-react"
import { getCompanySettings, updateCompanySettings, type CompanySettings } from "@/lib/supabase/company-settings"
import { useAuth } from "@/hooks/useAuth"
import { useOrganization } from "@/lib/context/SessionContext"
import { SUPPORTED_CURRENCIES, useOrgCurrency, type OrgCurrencyCode } from "@/lib/context/CurrencyContext"

// Tipo del formulario (UI). La API usa company_name, working_hours, etc.; el form usa name, business_hours, billing, services.
export type CompanySettingsForm = {
  id: string
  name: string
  rfc: string
  address: string
  phone: string
  email: string
  website: string
  logo: string
  business_hours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
  billing: {
    currency: string
    tax_rate: number
    invoice_prefix: string
    payment_terms: number
  }
  services: {
    default_service_time: number
    require_appointment: boolean
    send_notifications: boolean
  }
  created_at: string
  updated_at: string
}

const DEFAULT_BUSINESS_HOURS: CompanySettingsForm['business_hours'] = {
  monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
}
const DEFAULT_BILLING: CompanySettingsForm['billing'] = {
  currency: 'MXN', tax_rate: 16, invoice_prefix: 'FAC', payment_terms: 30
}
const DEFAULT_SERVICES: CompanySettingsForm['services'] = {
  default_service_time: 120, require_appointment: true, send_notifications: true
}

function getDefaultFormState(): CompanySettingsForm {
  return {
    id: '',
    name: '',
    rfc: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    business_hours: { ...DEFAULT_BUSINESS_HOURS },
    billing: { ...DEFAULT_BILLING },
    services: { ...DEFAULT_SERVICES },
    created_at: '',
    updated_at: ''
  }
}

/** Convierte la respuesta de la API (company_settings) al estado del formulario. */
function apiToFormSettings(api: CompanySettings | null): CompanySettingsForm {
  if (!api) return getDefaultFormState()
  const hours = api.working_hours && typeof api.working_hours === 'object' ? api.working_hours as Record<string, string> : {}
  const appDefaults = api.appointment_defaults && typeof api.appointment_defaults === 'object' ? api.appointment_defaults as Record<string, unknown> : {}
  return {
    id: api.id ?? '',
    name: api.company_name ?? '',
    rfc: api.tax_id ?? '',
    address: api.address ?? '',
    phone: api.phone ?? '',
    email: api.email ?? '',
    website: '',
    logo: api.logo_url ?? '',
    business_hours: {
      ...DEFAULT_BUSINESS_HOURS,
      ...hours
    },
    billing: {
      currency: api.currency ?? DEFAULT_BILLING.currency,
      tax_rate: api.tax_rate ?? DEFAULT_BILLING.tax_rate,
      invoice_prefix: (appDefaults.invoice_prefix as string) ?? DEFAULT_BILLING.invoice_prefix,
      payment_terms: typeof appDefaults.payment_terms === 'number' ? appDefaults.payment_terms : DEFAULT_BILLING.payment_terms
    },
    services: {
      default_service_time: (appDefaults.default_duration as number) ?? DEFAULT_SERVICES.default_service_time,
      require_appointment: typeof appDefaults.require_appointment === 'boolean' ? appDefaults.require_appointment : DEFAULT_SERVICES.require_appointment,
      send_notifications: typeof appDefaults.send_notifications === 'boolean' ? appDefaults.send_notifications : DEFAULT_SERVICES.send_notifications
    },
    created_at: api.created_at ?? '',
    updated_at: api.updated_at ?? ''
  }
}

/** Convierte el estado del formulario al payload que espera updateCompanySettings. */
function formToApiSettings(form: CompanySettingsForm): Parameters<typeof updateCompanySettings>[1] {
  return {
    company_name: form.name,
    tax_id: form.rfc || null,
    address: form.address || null,
    phone: form.phone || null,
    email: form.email || null,
    logo_url: form.logo || null,
    currency: form.billing.currency,
    tax_rate: form.billing.tax_rate,
    working_hours: form.business_hours,
    invoice_terms: `Pago a ${form.billing.payment_terms} días`,
    appointment_defaults: {
      default_duration: form.services.default_service_time,
      require_appointment: form.services.require_appointment,
      send_notifications: form.services.send_notifications,
      invoice_prefix: form.billing.invoice_prefix,
      payment_terms: form.billing.payment_terms
    }
  }
}

export default function EmpresaPage() {
  const { organization } = useAuth()
  const { organizationId } = useOrganization()
  const { setCurrency: setGlobalCurrency } = useOrgCurrency()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CompanySettingsForm>(getDefaultFormState())

  useEffect(() => {
    if (organizationId) {
      loadSettings()
    }
  }, [organizationId])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const settings = await getCompanySettings(organizationId as string)
      setFormData(apiToFormSettings(settings))
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof CompanySettingsForm] as object),
        [field]: value
      }
    }))
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        handleInputChange('logo', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!organizationId) throw new Error('organizationId no disponible')
      const success = await updateCompanySettings(organizationId, formToApiSettings(formData))
      if (success) {
        // Sincronizar la moneda seleccionada con el contexto global
        if (formData.billing?.currency && formData.billing.currency in SUPPORTED_CURRENCIES) {
          await setGlobalCurrency(formData.billing.currency as OrgCurrencyCode)
        }
        setIsEditing(false)
        alert('Configuración guardada exitosamente')
      } else {
        alert('Error al guardar la configuración')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ]

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Configuración de Empresa</h2>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Settings className="mr-2 h-4 w-4" /> Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información Básica */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Información Básica</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre de la Empresa *</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                placeholder="Nombre de tu taller"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rfc">RFC *</Label>
                <Input 
                  id="rfc" 
                  value={formData.rfc}
                  onChange={(e) => handleInputChange('rfc', e.target.value)}
                  disabled={!isEditing}
                  placeholder="RFC123456789"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  placeholder="+52 81 1234 5678"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Dirección *</Label>
              <Textarea 
                id="address" 
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={!isEditing}
                placeholder="Dirección completa del taller"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input 
                  id="website" 
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  disabled={!isEditing}
                  placeholder="www.empresa.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo de la Empresa */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Logo de la Empresa</h2>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground">
              {formData.logo ? (
                <img src={formData.logo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Sin logo</p>
                </div>
              )}
            </div>
            
            {isEditing && (
              <div className="flex gap-2">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Logo
                  </Button>
                </div>
                {formData.logo && (
                  <Button variant="outline" size="sm" onClick={() => handleInputChange('logo', '')}>
                    Eliminar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Horarios de Atención */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Horarios de Atención</h2>
          </div>
          
          <div className="grid gap-3">
            {daysOfWeek.map((day) => (
              <div key={day.key} className="flex items-center justify-between">
                <Label htmlFor={day.key} className="w-20 text-sm font-medium">
                  {day.label}
                </Label>
                <Input 
                  id={day.key}
                  value={(formData.business_hours ?? DEFAULT_BUSINESS_HOURS)[day.key as keyof typeof DEFAULT_BUSINESS_HOURS]}
                  onChange={(e) => handleNestedInputChange('business_hours', day.key, e.target.value)}
                  disabled={!isEditing}
                  className="w-32"
                  placeholder="08:00 - 18:00"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Configuración de Facturación */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Configuración de Facturación</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <select 
                  id="currency"
                  value={(formData.billing ?? DEFAULT_BILLING).currency}
                  onChange={(e) => handleNestedInputChange('billing', 'currency', e.target.value)}
                  disabled={!isEditing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.flag} {code} - {info.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tax_rate">Tasa de Impuesto (%)</Label>
                <Input 
                  id="tax_rate" 
                  type="number"
                  value={(formData.billing ?? DEFAULT_BILLING).tax_rate}
                  onChange={(e) => handleNestedInputChange('billing', 'tax_rate', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  placeholder="16"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_prefix">Prefijo de Facturas</Label>
                <Input 
                  id="invoice_prefix" 
                  value={(formData.billing ?? DEFAULT_BILLING).invoice_prefix}
                  onChange={(e) => handleNestedInputChange('billing', 'invoice_prefix', e.target.value)}
                  disabled={!isEditing}
                  placeholder="FAC"
                />
              </div>
              <div>
                <Label htmlFor="payment_terms">Términos de Pago (días)</Label>
                <Input 
                  id="payment_terms" 
                  type="number"
                  value={(formData.billing ?? DEFAULT_BILLING).payment_terms}
                  onChange={(e) => handleNestedInputChange('billing', 'payment_terms', parseInt(e.target.value))}
                  disabled={!isEditing}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuración de Servicios */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Configuración de Servicios</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="default_service_time">Tiempo de Servicio por Defecto (min)</Label>
              <Input 
                id="default_service_time" 
                type="number"
                value={(formData.services ?? DEFAULT_SERVICES).default_service_time}
                onChange={(e) => handleNestedInputChange('services', 'default_service_time', parseInt(e.target.value))}
                disabled={!isEditing}
                placeholder="120"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="require_appointment">Requerir Cita</Label>
                <input
                  type="checkbox"
                  id="require_appointment"
                  checked={(formData.services ?? DEFAULT_SERVICES).require_appointment}
                  onChange={(e) => handleNestedInputChange('services', 'require_appointment', e.target.checked)}
                  disabled={!isEditing}
                  className="h-4 w-4"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="send_notifications">Enviar Notificaciones</Label>
                <input
                  type="checkbox"
                  id="send_notifications"
                  checked={(formData.services ?? DEFAULT_SERVICES).send_notifications}
                  onChange={(e) => handleNestedInputChange('services', 'send_notifications', e.target.checked)}
                  disabled={!isEditing}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
