'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

interface PoliciesStepProps {
  data: any
  onChange: (data: any) => void
}

export function PoliciesStep({ data, onChange }: PoliciesStepProps) {
  const updatePolicies = (field: string, value: any) => {
    onChange({
      ...data,
      policies: {
        ...data.policies,
        [field]: value
      }
    })
  }

  const togglePaymentMethod = (method: string, checked: boolean) => {
    const current = data.policies?.payment_methods || []
    const updated = checked
      ? [...current, method]
      : current.filter((m: string) => m !== method)
    
    updatePolicies('payment_methods', updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📜 Políticas del Taller</CardTitle>
        <CardDescription>
          Define cómo opera tu negocio
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Formas de pago */}
        <div>
          <Label>Formas de pago aceptadas *</Label>
          <div className="space-y-2 mt-2">
            {['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'].map(method => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox 
                  id={`payment-${method}`}
                  checked={data.policies?.payment_methods?.includes(method) || false}
                  onCheckedChange={(checked) => togglePaymentMethod(method, checked === true)}
                />
                <label 
                  htmlFor={`payment-${method}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {method}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Depósito */}
        <div>
          <Label>¿Requieres depósito para reservar?</Label>
          <div className="flex items-center gap-4 mt-2">
            <Switch 
              checked={data.policies?.deposit_required || false}
              onCheckedChange={(checked) => updatePolicies('deposit_required', checked)}
            />
            <span className="text-sm text-text-secondary">
              {data.policies?.deposit_required ? 'Sí' : 'No'}
            </span>
          </div>
          
          {data.policies?.deposit_required && (
            <div className="mt-4">
              <Label>Porcentaje de depósito</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input 
                  type="number"
                  value={data.policies?.deposit_percentage || ''}
                  onChange={(e) => updatePolicies('deposit_percentage', parseInt(e.target.value) || 0)}
                  placeholder="30"
                  className="w-24"
                />
                <span className="text-sm text-text-secondary">%</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Cancelaciones */}
        <div>
          <Label>Política de cancelación</Label>
          <Textarea 
            value={data.policies?.cancellation_policy || ''}
            onChange={(e) => updatePolicies('cancellation_policy', e.target.value)}
            placeholder="24 horas de anticipación sin cargo. Cancelaciones tardías se cobra 50% del depósito."
            rows={3}
          />
        </div>
        
        {/* Garantía */}
        <div>
          <Label>Política de garantía</Label>
          <Textarea 
            value={data.policies?.warranty || data.policies?.warranty_policy || ''}
            onChange={(e) => updatePolicies('warranty', e.target.value)}
            placeholder="6 meses en refacciones y 3 meses en mano de obra"
            rows={2}
          />
        </div>
        
        {/* Seguros */}
        <div>
          <Label>¿Aceptas seguros?</Label>
          <div className="flex items-center gap-4 mt-2">
            <Switch 
              checked={data.policies?.insurance_accepted || false}
              onCheckedChange={(checked) => updatePolicies('insurance_accepted', checked)}
            />
            <span className="text-sm text-text-secondary">
              {data.policies?.insurance_accepted ? 'Sí' : 'No'}
            </span>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}
