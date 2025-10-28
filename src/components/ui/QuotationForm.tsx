'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Separator } from './separator';
import { BillingItemsManager } from './BillingItemsManager';
import { 
  Save, 
  Send, 
  X, 
  Plus,
  Calculator,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotationFormProps {
  quotation?: {
    id: string;
    quotationNumber: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    status: string;
    notes: string;
    validUntil: string;
    items: QuotationItem[];
    subtotal: number;
    tax: number;
    total: number;
  };
  onSave: (quotation: any) => void;
  onSend: (quotation: any) => void;
  onCancel: () => void;
  customers: Array<{ id: string; name: string; email: string }>;
}

export function QuotationForm({
  quotation,
  onSave,
  onSend,
  onCancel,
  customers
}: QuotationFormProps) {
  const [formData, setFormData] = useState({
    quotationNumber: quotation?.quotationNumber || '',
    customerId: quotation?.customerId || '',
    customerName: quotation?.customerName || '',
    customerEmail: quotation?.customerEmail || '',
    status: quotation?.status || 'draft',
    notes: quotation?.notes || '',
    validUntil: quotation?.validUntil || '',
    items: quotation?.items || [],
    subtotal: quotation?.subtotal || 0,
    tax: quotation?.tax || 0,
    total: quotation?.total || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (quotation) {
      setFormData(quotation);
    }
  }, [quotation]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleItemsChange = (items: QuotationItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16; // 16% IVA
    const total = subtotal + tax;

    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      tax,
      total
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.quotationNumber.trim()) {
      newErrors.quotationNumber = 'El número de cotización es requerido';
    }

    if (!formData.customerId) {
      newErrors.customerId = 'Debe seleccionar un cliente';
    }

    if (!formData.validUntil) {
      newErrors.validUntil = 'La fecha de vencimiento es requerida';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debe agregar al menos un item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleSend = () => {
    if (validateForm()) {
      onSend({ ...formData, status: 'sent' });
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {quotation ? 'Editar Cotización' : 'Nueva Cotización'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotationNumber">Número de Cotización</Label>
              <Input
                id="quotationNumber"
                value={formData.quotationNumber}
                onChange={(e) => handleInputChange('quotationNumber', e.target.value)}
                placeholder="COT-001"
                className={errors.quotationNumber ? 'border-red-500' : ''}
              />
              {errors.quotationNumber && (
                <p className="text-sm text-red-500">{errors.quotationNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Válida hasta</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                className={errors.validUntil ? 'border-red-500' : ''}
              />
              {errors.validUntil && (
                <p className="text-sm text-red-500">{errors.validUntil}</p>
              )}
            </div>
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente</Label>
            <Select
              value={formData.customerId}
              onValueChange={(value) => {
                const customer = customers.find(c => c.id === value);
                handleInputChange('customerId', value);
                if (customer) {
                  handleInputChange('customerName', customer.name);
                  handleInputChange('customerEmail', customer.email);
                }
              }}
            >
              <SelectTrigger className={errors.customerId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-sm text-red-500">{errors.customerId}</p>
            )}
          </div>

          {/* Customer Info Display */}
          {selectedCustomer && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="text-muted-foreground">{selectedCustomer.email}</div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Notas adicionales para la cotización..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Items de la Cotización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BillingItemsManager
            items={formData.items}
            onChange={handleItemsChange}
            error={errors.items}
          />
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(formData.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (16%):</span>
              <span>{formatCurrency(formData.tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(formData.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Guardar
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleSend}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Enviar
        </Button>
        
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}



















