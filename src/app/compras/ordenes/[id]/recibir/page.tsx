'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  supplier?: {
    name: string;
  };
  items?: PurchaseOrderItem[];
}

export default function ReceivePurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
    try {
      setLoading(true);
      
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        // El endpoint ahora retorna items directamente con product_name mapeado
        const orderData = data.data;
        
        setOrder(orderData);
        
        // Inicializar cantidades recibidas en 0
        const initialQuantities: Record<string, number> = {};
        if (orderData.items) {
          orderData.items.forEach((item: PurchaseOrderItem) => {
            initialQuantities[item.id] = 0;
          });
        }
        setReceivedQuantities(initialQuantities);
      } else {
        toast.error(data.error || "No se pudo cargar la orden");
        router.push('/compras/ordenes');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error("Error al cargar la orden");
      router.push('/compras/ordenes');
    } finally {
      setLoading(false);
    }
  }

  function handleQuantityChange(itemId: string, value: string) {
    const quantity = parseInt(value) || 0;
    setReceivedQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  }

  function getPendingQuantity(item: PurchaseOrderItem) {
    return item.quantity_ordered - (item.quantity_received || 0);
  }

  function canReceiveItem(item: PurchaseOrderItem) {
    const pending = getPendingQuantity(item);
    return pending > 0;
  }

  async function handleReceive() {
    if (!order) return;
    
    // Validar que hay items para recibir
    const itemsToReceive = (order.items || [])
      .filter(item => {
        const qty = receivedQuantities[item.id] || 0;
        return qty > 0;
      })
      .map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity_received: receivedQuantities[item.id]
      }));
    
    if (itemsToReceive.length === 0) {
      toast.error("Debes especificar al menos una cantidad a recibir");
      return;
    }
    
    // Validar que no exceda cantidades pendientes
    for (const item of order.items || []) {
      const qty = receivedQuantities[item.id] || 0;
      const pending = getPendingQuantity(item);
      
      if (qty > pending) {
        toast.error(`La cantidad para ${item.product_name || 'el producto'} excede la cantidad pendiente (${pending})`);
        return;
      }
    }
    
    try {
      setSaving(true);
      
      const res = await fetch(`/api/purchase-orders/${orderId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: itemsToReceive })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Recepción exitosa: Se recibieron ${data.data.items_processed} items correctamente`);
        
        // Esperar 1 segundo y redirigir
        setTimeout(() => {
          router.push('/compras/ordenes');
        }, 1000);
      } else {
        toast.error(data.error || "Error al recibir mercancía");
      }
    } catch (error) {
      console.error('Error receiving order:', error);
      toast.error("Error al procesar la recepción");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <StandardBreadcrumbs 
          currentPage="Recibir Mercancía"
          parentPages={[
            { label: "Compras", href: "/compras" },
            { label: "Órdenes de Compra", href: "/compras/ordenes" }
          ]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando orden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <StandardBreadcrumbs 
          currentPage="Recibir Mercancía"
          parentPages={[
            { label: "Compras", href: "/compras" },
            { label: "Órdenes de Compra", href: "/compras/ordenes" }
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Orden no encontrada</p>
          <Button onClick={() => router.push('/compras/ordenes')} className="mt-4">
            Volver a Órdenes
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const totalToReceive = (order.items || []).reduce((sum, item) => {
    const qty = receivedQuantities[item.id] || 0;
    return sum + (qty * item.unit_cost);
  }, 0);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviada';
      case 'in_transit': return 'En tránsito';
      case 'received': return 'Recibida';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Recibir Mercancía"
        parentPages={[
          { label: "Compras", href: "/compras" },
          { label: "Órdenes de Compra", href: "/compras/ordenes" }
        ]}
      />

      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recibir Mercancía</h1>
            <p className="text-muted-foreground">
              Orden {order.order_number}
            </p>
          </div>
          
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {getStatusLabel(order.status)}
          </Badge>
        </div>
      </div>

      {/* Order Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información de la Orden</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="font-medium">{order.supplier?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Orden</p>
              <p className="font-medium">{formatDate(order.order_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total a Recibir</p>
              <p className="font-medium text-lg">{formatCurrency(totalToReceive)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items to Receive */}
      <Card>
        <CardHeader>
          <CardTitle>Items a Recibir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => {
                const pending = getPendingQuantity(item);
                const canReceive = canReceiveItem(item);
                
                return (
                  <div 
                    key={item.id}
                    className={`border rounded-lg p-4 ${!canReceive ? 'bg-muted/50' : ''}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Product Info */}
                      <div className="md:col-span-4">
                        <p className="font-medium">{item.product_name || 'Producto'}</p>
                        <p className="text-sm text-muted-foreground">
                          Costo unitario: {formatCurrency(item.unit_cost)}
                        </p>
                      </div>
                      
                      {/* Quantities */}
                      <div className="md:col-span-2 text-center">
                        <p className="text-sm text-muted-foreground">Ordenado</p>
                        <p className="font-medium">{item.quantity_ordered}</p>
                      </div>
                      
                      <div className="md:col-span-2 text-center">
                        <p className="text-sm text-muted-foreground">Recibido</p>
                        <p className="font-medium">{item.quantity_received || 0}</p>
                      </div>
                      
                      <div className="md:col-span-2 text-center">
                        <p className="text-sm text-muted-foreground">Pendiente</p>
                        <p className="font-medium text-orange-600">{pending}</p>
                      </div>
                      
                      {/* Input */}
                      <div className="md:col-span-2">
                        {canReceive ? (
                          <Input
                            type="number"
                            min="0"
                            max={pending}
                            value={receivedQuantities[item.id] || ''}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            placeholder="Cantidad"
                            className="text-center"
                          />
                        ) : (
                          <Badge variant="secondary" className="w-full justify-center">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Completo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay items en esta orden
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancelar
        </Button>
        
        <Button
          onClick={handleReceive}
          disabled={saving || !order.items?.length}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            'Procesando...'
          ) : (
            <>
              <Package className="mr-2 h-4 w-4" />
              Confirmar Recepción
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
