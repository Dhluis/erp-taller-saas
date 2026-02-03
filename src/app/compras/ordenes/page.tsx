'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Clock, CheckCircle, DollarSign } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  total: number | string;
  created_at: string;
  supplier?: {
    name: string;
  };
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      
      const res = await fetch('/api/purchase-orders', {
        cache: 'no-cache',
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (data.success) {
        const items = data.data?.items || [];
        setOrders(items);
        
        // Calcular stats desde los datos
        setStats({
          total: items.length,
          pending: items.filter(o => o.status === 'draft' || o.status === 'sent').length,
          approved: items.filter(o => o.status === 'received').length,
          totalValue: items.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
        });
        
        console.log('✅ Órdenes cargadas:', items.length);
      } else {
        console.error('❌ Error del API:', data.error);
      }
    } catch (error) {
      console.error('❌ Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number | string | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(numAmount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Borrador', className: 'bg-gray-500 text-white' },
      sent: { label: 'Enviada', className: 'bg-blue-500 text-white' },
      in_transit: { label: 'En tránsito', className: 'bg-yellow-500 text-white' },
      received: { label: 'Recibida', className: 'bg-green-500 text-white' },
      cancelled: { label: 'Cancelada', className: 'bg-red-500 text-white' }
    };
    
    const config = statusConfig[status] || { label: status, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Órdenes de Compra</h1>
        <p>Cargando órdenes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
        <Button className="bg-cyan-500 hover:bg-cyan-600">
          + Crear Nueva Orden
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Órdenes registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Por aprobar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Monto total de compras</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input 
          placeholder="Buscar por proveedor o ID..."
          className="max-w-md"
        />
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No hay órdenes de compra registradas
              </p>
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                Crear Primera Orden
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">ID</th>
                    <th className="text-left p-4">Proveedor</th>
                    <th className="text-left p-4">Total</th>
                    <th className="text-left p-4">Estado</th>
                    <th className="text-left p-4">Items</th>
                    <th className="text-left p-4">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono text-sm">{order.order_number}</td>
                      <td className="p-4">{order.supplier?.name || 'Sin proveedor'}</td>
                      <td className="p-4">{formatCurrency(order.total)}</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4">-</td>
                      <td className="p-4">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
