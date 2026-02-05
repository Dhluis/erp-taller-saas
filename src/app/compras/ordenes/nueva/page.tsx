'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface OrderItem {
  id: string; // temporary ID for UI
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load suppliers
      const suppliersRes = await fetch('/api/suppliers?pageSize=100', {
        credentials: 'include'
      });
      const suppliersData = await suppliersRes.json();
      if (suppliersData.success) {
        setSuppliers(suppliersData.data?.items || []);
      }
      
      // Load products from inventory
      const productsRes = await fetch('/api/inventory?pageSize=1000', {
        credentials: 'include'
      });
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data?.items || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_cost: 0,
      total: 0
    };
    setItems([...items, newItem]);
  }

  function removeItem(id: string) {
    setItems(items.filter(item => item.id !== id));
  }

  function updateItem(id: string, field: keyof OrderItem, value: any) {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // If product changed, update name
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        updated.product_name = product?.name || '';
      }
      
      // Recalculate total
      updated.total = updated.quantity * updated.unit_cost;
      
      return updated;
    }));
  }

  function calculateTotals() {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  async function handleSave() {
    // Validations
    if (!supplierId) {
      toast.error('Debes seleccionar un proveedor');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Debes agregar al menos un item');
      return;
    }
    
    // Validate all items have product and quantity
    const invalidItems = items.filter(item => 
      !item.product_id || item.quantity <= 0 || item.unit_cost <= 0
    );
    
    if (invalidItems.length > 0) {
      toast.error('Todos los items deben tener producto, cantidad y costo válidos');
      return;
    }
    
    try {
      setSaving(true);
      
      const payload = {
        supplier_id: supplierId,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost
        }))
      };
      
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Orden ${data.data.order_number} creada exitosamente`);
        
        setTimeout(() => {
          router.push('/compras/ordenes');
        }, 1000);
      } else {
        toast.error(data.error || 'Error al crear orden');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear orden');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <StandardBreadcrumbs 
          currentPage="Nueva Orden de Compra"
          parentPages={[
            { label: "Compras", href: "/compras" },
            { label: "Órdenes de Compra", href: "/compras/ordenes" }
          ]}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Nueva Orden de Compra</h1>
          <p className="text-muted-foreground">Crea una nueva orden de compra para tus proveedores</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor *</Label>
                <Select 
                  value={supplierId}
                  onValueChange={setSupplierId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {suppliers.map(supplier => (
                      <SelectItem 
                        key={supplier.id} 
                        value={supplier.id}
                        className="bg-gray-900 text-white hover:bg-gray-800 focus:bg-gray-800"
                      >
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Order Date */}
              <div className="space-y-2">
                <Label htmlFor="orderDate">Fecha de Orden *</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              
              {/* Expected Delivery */}
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">Fecha de Entrega Esperada</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items de la Orden</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Item
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay items. Haz clic en "Agregar Item" para comenzar.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Item #{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Product */}
                      <div className="space-y-2">
                        <Label>Producto *</Label>
                        <Select 
                          value={item.product_id}
                          onValueChange={(value) => updateItem(item.id, 'product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label>Cantidad *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Si está vacío, usar 0
                            if (value === '' || value === '-' || value === '+') {
                              updateItem(item.id, 'quantity', 0);
                            } else {
                              const numValue = parseInt(value);
                              updateItem(item.id, 'quantity', isNaN(numValue) ? 0 : numValue);
                            }
                          }}
                          onFocus={(e) => {
                            // Si el valor es 0 o 1, seleccionar todo el texto
                            if (item.quantity === 0 || item.quantity === 1) {
                              e.target.select();
                            }
                          }}
                        />
                      </div>
                      
                      {/* Unit Cost */}
                      <div className="space-y-2">
                        <Label>Costo Unitario *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost === 0 ? '' : item.unit_cost}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Si está vacío o solo tiene signos, usar 0
                            if (value === '' || value === '-' || value === '+') {
                              updateItem(item.id, 'unit_cost', 0);
                            } else {
                              const numValue = parseFloat(value);
                              updateItem(item.id, 'unit_cost', isNaN(numValue) ? 0 : numValue);
                            }
                          }}
                          onFocus={(e) => {
                            // Si el valor es 0, seleccionar todo el texto para reemplazarlo fácilmente
                            if (item.unit_cost === 0) {
                              e.target.select();
                            }
                          }}
                        />
                      </div>
                      
                      {/* Total */}
                      <div className="space-y-2">
                        <Label>Total</Label>
                        <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span className="font-semibold">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {saving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Crear Orden
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
