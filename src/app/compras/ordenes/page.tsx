'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Clock, CheckCircle, DollarSign, Package, Eye, XCircle } from 'lucide-react';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';

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

const STATUS_FILTER_ALL = 'all';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { currency } = useOrgCurrency();
  const hasLoadedRef = useRef(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalValue: 0
  });

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadOrders();
    }
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
          totalValue: items.reduce((sum, o) => sum + (parseFloat(o.total_amount ?? o.total) || 0), 0)
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

  const handleCreateOrder = () => {
    router.push('/compras/ordenes/nueva');
  };

  async function handleCancelOrder(orderId: string) {
    if (!confirm('¿Cancelar esta orden de compra? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.data) {
        loadOrders();
      } else {
        console.error('Error cancelando:', data.error);
      }
    } catch (err) {
      console.error('Error cancelando orden:', err);
    }
  }

  const formatCurrency = (amount: number | string | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
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
      partial: { label: 'Recibido parcial', className: 'bg-orange-500 text-white' },
      received: { label: 'Recibida', className: 'bg-green-500 text-white' },
      cancelled: { label: 'Cancelada', className: 'bg-red-500 text-white' }
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const canReceiveOrder = (status: string) =>
    ['sent', 'in_transit', 'partial'].includes(status);

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      statusFilter === STATUS_FILTER_ALL || order.status === statusFilter;
    const matchSearch =
      !searchTerm ||
      (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <StandardBreadcrumbs 
          currentPage="Órdenes de Compra"
          parentPages={[
            { label: "Compras", href: "/compras" }
          ]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando órdenes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Órdenes de Compra"
        parentPages={[
          { label: "Compras", href: "/compras" }
        ]}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
          <p className="text-muted-foreground">Gestiona tus órdenes de compra a proveedores</p>
        </div>
        <Button 
          className="bg-cyan-500 hover:bg-cyan-600"
          onClick={() => router.push('/compras/ordenes/nueva')}
        >
          + Crear Nueva Orden
        </Button>
      </div>

      {/* Stats Cards con colores del dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Órdenes registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Por aprobar</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Monto total de compras</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Buscar por proveedor o número..."
          className="max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value={STATUS_FILTER_ALL} className="text-white hover:bg-slate-800">
              Todos
            </SelectItem>
            <SelectItem value="draft" className="text-white hover:bg-slate-800">Borrador</SelectItem>
            <SelectItem value="sent" className="text-white hover:bg-slate-800">Enviada</SelectItem>
            <SelectItem value="in_transit" className="text-white hover:bg-slate-800">En tránsito</SelectItem>
            <SelectItem value="partial" className="text-white hover:bg-slate-800">Recibido parcial</SelectItem>
            <SelectItem value="received" className="text-white hover:bg-slate-800">Recibida</SelectItem>
            <SelectItem value="cancelled" className="text-white hover:bg-slate-800">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No hay órdenes de compra registradas
              </p>
              <Button
                className="bg-cyan-500 hover:bg-cyan-600"
                onClick={() => router.push('/compras/ordenes/nueva')}
              >
                + Nueva Orden
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4"># Orden</th>
                    <th className="text-left p-4">Proveedor</th>
                    <th className="text-left p-4">Estado</th>
                    <th className="text-left p-4">Total</th>
                    <th className="text-left p-4">Fecha</th>
                    <th className="text-left p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono text-sm">{order.order_number}</td>
                      <td className="p-4">{order.supplier?.name || 'Sin proveedor'}</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4">{formatCurrency(order.total_amount ?? order.total)}</td>
                      <td className="p-4">{formatDate(order.created_at)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/compras/ordenes/${order.id}`)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Ver
                          </Button>
                          {canReceiveOrder(order.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/compras/ordenes/${order.id}/recibir`)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                            >
                              <Package className="mr-1 h-3 w-3" />
                              Recibir
                            </Button>
                          )}
                          {order.status !== 'received' && order.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelOrder(order.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
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
