'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  quantity_received: number;
  unit_cost: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  expected_delivery_date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  supplier?: { name: string };
  items?: OrderItem[];
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { currency } = useOrgCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-orders/${orderId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) setOrder(data.data);
      else router.push('/compras/ordenes');
    } catch {
      router.push('/compras/ordenes');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number | undefined) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount || 0);
  const formatDate = (d: string | undefined) => (d ? new Date(d).toLocaleDateString('es-MX') : '-');

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: 'Borrador', className: 'bg-gray-500' },
      sent: { label: 'Enviada', className: 'bg-blue-500' },
      in_transit: { label: 'En tránsito', className: 'bg-yellow-500' },
      partial: { label: 'Recibido parcial', className: 'bg-orange-500' },
      received: { label: 'Recibida', className: 'bg-green-500' },
      cancelled: { label: 'Cancelada', className: 'bg-red-500' }
    };
    const c = config[status] || { label: status, className: 'bg-gray-500' };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const canReceive = order && ['sent', 'in_transit', 'partial'].includes(order.status);

  if (loading || !order) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StandardBreadcrumbs
        currentPage={`Orden ${order.order_number}`}
        parentPages={[
          { label: 'Compras', href: '/compras' },
          { label: 'Órdenes', href: '/compras/ordenes' }
        ]}
      />
      <div className="flex justify-between items-start">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        {canReceive && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => router.push(`/compras/ordenes/${orderId}/recibir`)}
          >
            <Package className="mr-2 h-4 w-4" />
            Recibir mercancía
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Orden {order.order_number}</CardTitle>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="font-medium">{order.supplier?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">{formatDate(order.order_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entrega esperada</p>
              <p className="font-medium">{formatDate(order.expected_delivery_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium">{formatCurrency(order.total_amount ?? order.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Producto</th>
                  <th className="text-right p-3">Cantidad</th>
                  <th className="text-right p-3">Recibido</th>
                  <th className="text-right p-3">Costo unit.</th>
                  <th className="text-right p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">{item.product_name}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">{item.quantity_received}</td>
                    <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
                    <td className="p-3 text-right">{formatCurrency(item.total_amount ?? item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-4 text-sm">
            <span>Subtotal: {formatCurrency(order.subtotal)}</span>
            <span>IVA: {formatCurrency(order.tax)}</span>
            <span className="font-bold">Total: {formatCurrency(order.total_amount ?? order.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
