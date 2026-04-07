"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CreditCard,
  Settings,
  Save,
  Upload,
  Camera,
  FileText,
  Trash2,
  Eye
} from "lucide-react"
import { getCompanySettings, updateCompanySettings, type CompanySettings } from "@/lib/supabase/company-settings"
import { uploadTermsPdf, deleteTermsPdf } from "@/lib/supabase/terms-pdf"
import { uploadCompanyLogo } from "@/lib/supabase/logo-storage"
import { useAuth } from "@/hooks/useAuth"
import { useOrganization } from "@/lib/context/SessionContext"
import { usePermissions } from "@/hooks/usePermissions"
import { SUPPORTED_CURRENCIES, useOrgCurrency, type OrgCurrencyCode } from "@/lib/context/CurrencyContext"
import { detectLocaleFromTimezone, isDetectedSameAsSaved, type DetectedLocale } from "@/lib/locale/detect-locale"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'sonner'

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
  terms_pdf_url: string
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
  created_at: string
  updated_at: string
}

const DEFAULT_BUSINESS_HOURS: CompanySettingsForm['business_hours'] = {
  monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
}
const DEFAULT_BILLING: CompanySettingsForm['billing'] = {
  currency: 'MXN', tax_rate: 16, invoice_prefix: 'FAC', payment_terms: 30
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
    terms_pdf_url: '',
    business_hours: { ...DEFAULT_BUSINESS_HOURS },
    billing: { ...DEFAULT_BILLING },
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
    terms_pdf_url: (api as any).terms_pdf_url ?? '',
    business_hours: {
      ...DEFAULT_BUSINESS_HOURS,
      ...hours
    },
    billing: {
      currency: (api.base_currency ?? api.currency) ?? DEFAULT_BILLING.currency,
      tax_rate: api.tax_rate ?? DEFAULT_BILLING.tax_rate,
      invoice_prefix: (appDefaults.invoice_prefix as string) ?? DEFAULT_BILLING.invoice_prefix,
      payment_terms: typeof appDefaults.payment_terms === 'number' ? appDefaults.payment_terms : DEFAULT_BILLING.payment_terms
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
    base_currency: form.billing.currency,
    tax_rate: form.billing.tax_rate,
    working_hours: form.business_hours,
    invoice_terms: `Pago a ${form.billing.payment_terms} días`,
    terms_pdf_url: form.terms_pdf_url || null,
    appointment_defaults: {
      invoice_prefix: form.billing.invoice_prefix,
      payment_terms: form.billing.payment_terms
    }
  }
}

export default function EmpresaPage() {
  const { organization } = useAuth()
  const { organizationId } = useOrganization()
  const permissions = usePermissions()
  const { setCurrency: setGlobalCurrency } = useOrgCurrency()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [formData, setFormData] = useState<CompanySettingsForm>(getDefaultFormState())
  const [detectedLocale, setDetectedLocale] = useState<DetectedLocale | null>(null)

  useEffect(() => {
    if (organizationId) {
      loadSettings()
    }
  }, [organizationId])

  useEffect(() => {
    if (isLoading) return
    setDetectedLocale(detectLocaleFromTimezone())
  }, [isLoading])

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

  const applyDetectedCurrency = async () => {
    if (!detectedLocale || !organizationId) return
    const currency = detectedLocale.currencyCode
    setIsSaving(true)
    try {
      // Merge with current formData to satisfy NOT NULL constraints (e.g. company_name)
      const updatedForm = {
        ...formData,
        billing: { ...formData.billing, currency }
      }
      await updateCompanySettings(organizationId, formToApiSettings(updatedForm))
      setFormData(updatedForm)
      if (currency in SUPPORTED_CURRENCIES) {
        await setGlobalCurrency(currency as OrgCurrencyCode)
      }
      setDetectedLocale(null)
      toast.success('Moneda actualizada a ' + currency + '. Ingresos, gastos y reportes usarán esta moneda.')
    } catch (error) {
      console.error('Error al aplicar moneda detectada:', error)
      toast.error('No se pudo actualizar la moneda. Intenta de nuevo.')
    } finally {
      setIsSaving(false)
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !organizationId) return

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB')
      return
    }

    setIsUploadingLogo(true)
    try {
      const url = await uploadCompanyLogo(organizationId, file)
      // Only update local form state. Full save (with company_name) happens on handleSave.
      handleInputChange('logo', url)
      toast.success('Logo listo. Haz clic en Guardar para aplicar los cambios.')
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast.error(error.message || 'Error al subir el logo')
    } finally {
      setIsUploadingLogo(false)
      const input = document.getElementById('logo-upload') as HTMLInputElement
      if (input) input.value = ''
    }
  }

  const handleTermsPdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !organizationId) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB')
      return
    }

    setIsUploadingPdf(true)
    try {
      const url = await uploadTermsPdf(organizationId, file)
      // Only update local form state. Full save happens on handleSave.
      handleInputChange('terms_pdf_url', url)
      toast.success('PDF listo. Haz clic en Guardar para aplicar los cambios.')
    } catch (error: any) {
      console.error('Error uploading terms PDF:', error)
      toast.error(error.message || 'Error al subir el PDF')
    } finally {
      setIsUploadingPdf(false)
      const input = document.getElementById('terms-pdf-upload') as HTMLInputElement
      if (input) input.value = ''
    }
  }

  const handleTermsPdfDelete = async () => {
    if (!organizationId) return
    setIsUploadingPdf(true)
    try {
      await deleteTermsPdf(organizationId)
      // Only update local form state. Full save happens on handleSave.
      handleInputChange('terms_pdf_url', '')
      toast.success('Términos y condiciones eliminados. Haz clic en Guardar para confirmar.')
    } catch (error: any) {
      console.error('Error deleting terms PDF:', error)
      toast.error('Error al eliminar el PDF')
    } finally {
      setIsUploadingPdf(false)
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
        toast.success('Configuración guardada exitosamente')
      } else {
        toast.error('Error al guardar la configuración')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error al guardar la configuración')
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
      <StandardBreadcrumbs
        currentPage="Configuración de Empresa"
        parentPages={[{ label: "Configuraciones", href: "/configuraciones/empresa" }]}
        className="mb-2"
      />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Configuración de Empresa</h2>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            permissions.canManageSettings() && (
              <Button onClick={() => setIsEditing(true)}>
                <Settings className="mr-2 h-4 w-4" /> Editar
              </Button>
            )
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

      {detectedLocale && !isDetectedSameAsSaved(detectedLocale, formData.billing?.currency) && (
        <Alert className="border-primary/50 bg-primary/5">
          <MapPin className="h-4 w-4 text-primary" />
          <AlertDescription className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span>
              Según tu ubicación sugerimos: <strong>{detectedLocale.countryName}</strong> ({detectedLocale.currencyCode}). 
              Así las cantidades (ingresos, gastos, reportes) serán exactas en tu moneda.
            </span>
            <Button
              size="sm"
              onClick={applyDetectedCurrency}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : `Usar ${detectedLocale.currencyCode}`}
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Logo
                      </>
                    )}
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
                <Label htmlFor="currency">Moneda del taller</Label>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Ingresos, gastos y reportes se registran en esta moneda.
                </p>
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


        {/* Términos y Condiciones PDF */}
        <div className="bg-card p-6 rounded-lg border lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-semibold">Términos y Condiciones</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Sube el PDF de términos y condiciones de tu taller. <strong>Solo necesitas subirlo una vez</strong> y aparecerá automáticamente en todas las órdenes de trabajo.
          </p>

          {formData.terms_pdf_url ? (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <FileText className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Términos y condiciones configurados</p>
                  <p className="text-xs text-muted-foreground">Aparecen en todas las órdenes de trabajo</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(formData.terms_pdf_url, '_blank', 'noopener,noreferrer')}
                >
                  <Eye className="h-4 w-4 mr-1" /> Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleTermsPdfDelete}
                  disabled={isUploadingPdf}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center">
              <FileText className="h-10 w-10 mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium mb-1">Sin PDF configurado</p>
              <p className="text-xs text-muted-foreground mb-4">Sube tu documento de términos y condiciones (máx. 10MB)</p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleTermsPdfUpload}
                className="hidden"
                id="terms-pdf-upload"
                disabled={isUploadingPdf}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('terms-pdf-upload')?.click()}
                disabled={isUploadingPdf}
              >
                {isUploadingPdf ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" /> Subiendo...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Subir PDF</>
                )}
              </Button>
            </div>
          )}

          {/* Reemplazar PDF existente */}
          {formData.terms_pdf_url && (
            <div className="mt-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleTermsPdfUpload}
                className="hidden"
                id="terms-pdf-replace"
                disabled={isUploadingPdf}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => document.getElementById('terms-pdf-replace')?.click()}
                disabled={isUploadingPdf}
              >
                {isUploadingPdf ? 'Subiendo...' : '↻ Reemplazar PDF'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
