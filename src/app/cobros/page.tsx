'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  reference: string;
  customer_name?: string;
  invoice_number?: string;
  notes?: string;
}

interface PaymentStats {
  totalAmount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

export default function CobrosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalAmount: 0,
    completedCount: 0,
    pendingCount: 0,
    failedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'Efectivo',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: 'Cobros', href: '/cobros' },
  ];

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      // Simular carga de datos reales
      const mockPayments: Payment[] = [
        {
          id: '1',
          invoice_id: 'INV-001',
          amount: 1500.00,
          payment_method: 'Efectivo',
          payment_date: '2024-01-15',
          status: 'completed',
          reference: 'REF-001',
          customer_name: 'Juan Pérez',
          invoice_number: 'FAC-2024-001',
          notes: 'Pago en efectivo recibido'
        },
        {
          id: '2',
          invoice_id: 'INV-002',
          amount: 2500.00,
          payment_method: 'Transferencia',
          payment_date: '2024-01-16',
          status: 'pending',
          reference: 'REF-002',
          customer_name: 'María García',
          invoice_number: 'FAC-2024-002',
          notes: 'Transferencia pendiente de confirmación'
        },
        {
          id: '3',
          invoice_id: 'INV-003',
          amount: 800.00,
          payment_method: 'Tarjeta',
          payment_date: '2024-01-17',
          status: 'completed',
          reference: 'REF-003',
          customer_name: 'Carlos López',
          invoice_number: 'FAC-2024-003',
          notes: 'Pago con tarjeta procesado'
        }
      ];

      setPayments(mockPayments);
      
      // Calcular estadísticas
      const totalAmount = mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const completedCount = mockPayments.filter(p => p.status === 'completed').length;
      const pendingCount = mockPayments.filter(p => p.status === 'pending').length;
      const failedCount = mockPayments.filter(p => p.status === 'failed').length;

      setStats({
        totalAmount,
        completedCount,
        pendingCount,
        failedCount
      });

    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('No se pudieron cargar los cobros');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    // Aquí se abriría el modal de edición
    toast.info(`Editando cobro ${payment.reference}`);
  };

  const handleNewPayment = () => {
    setNewPayment({
      invoice_id: '',
      amount: '',
      payment_method: 'Efectivo',
      payment_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: ''
    });
    setShowNewPaymentModal(true);
  };

  const handleNewPaymentInputChange = (field: string, value: string) => {
    setNewPayment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreatePayment = async () => {
    if (!newPayment.invoice_id || !newPayment.amount || !newPayment.reference) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      // Simular creación de cobro
      const newPaymentData: Payment = {
        id: Date.now().toString(),
        invoice_id: newPayment.invoice_id,
        amount: parseFloat(newPayment.amount),
        payment_method: newPayment.payment_method,
        payment_date: newPayment.payment_date,
        status: 'completed',
        reference: newPayment.reference,
        customer_name: 'Cliente Nuevo',
        invoice_number: `FAC-${Date.now()}`,
        notes: newPayment.notes
      };

      // Agregar a la lista local
      setPayments(prev => [newPaymentData, ...prev]);
      
      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        totalAmount: prev.totalAmount + newPaymentData.amount,
        completedCount: prev.completedCount + 1
      }));

      toast.success('Cobro creado exitosamente');
      setShowNewPaymentModal(false);
      setNewPayment({
        invoice_id: '',
        amount: '',
        payment_method: 'Efectivo',
        payment_date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      });

    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Error al crear el cobro');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completado', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Fallido', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppLayout
        title="Cobros"
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-8 p-6">
          <PageHeader
            title="Cobros"
            description="Gestión de pagos y cobros"
            breadcrumbs={breadcrumbs}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse bg-bg-secondary border border-border">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Cobros"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8 p-6">
        <PageHeader
          title="Cobros"
          description="Gestión de pagos y cobros"
          breadcrumbs={breadcrumbs}
          actions={
            <Button onClick={handleNewPayment}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Cobro
            </Button>
          }
        />

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Total Cobrado</CardTitle>
              <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">${stats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Monto total de cobros
              </p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Cobros Completados</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">{stats.completedCount}</div>
              <p className="text-xs text-muted-foreground">
                Pagos procesados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Pendientes</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">{stats.pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Cobros pendientes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por factura, referencia o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de cobros */}
        {filteredPayments.length === 0 ? (
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {searchTerm ? 'No se encontraron cobros' : 'No hay cobros registrados'}
              </h3>
              <p className="text-text-secondary mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Comienza registrando el primer cobro'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleNewPayment}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Nuevo Cobro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <CurrencyDollarIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {payment.invoice_number || `Factura ${payment.invoice_id}`}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Referencia: {payment.reference}
                        </p>
                        {payment.customer_name && (
                          <p className="text-sm text-text-secondary">
                            Cliente: {payment.customer_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-text-primary">
                        ${payment.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-text-secondary">Método de Pago</label>
                      <p className="font-medium text-text-primary">{payment.payment_method}</p>
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Fecha</label>
                      <p className="font-medium text-text-primary">{new Date(payment.payment_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Estado</label>
                      <div className="mt-1">
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleViewDetails(payment)}
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Ver Detalles
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleEditPayment(payment)}
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal para Nuevo Cobro */}
        {showNewPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black border border-border shadow-lg rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#000000'}}>
              <h2 className="text-xl font-bold mb-4 text-text-primary">Nuevo Cobro</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">ID de Factura *</label>
                  <Input
                    value={newPayment.invoice_id}
                    onChange={(e) => handleNewPaymentInputChange('invoice_id', e.target.value)}
                    placeholder="Ej: INV-001"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Monto *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={(e) => handleNewPaymentInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Método de Pago</label>
                  <select
                    value={newPayment.payment_method}
                    onChange={(e) => handleNewPaymentInputChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Fecha de Pago</label>
                  <Input
                    type="date"
                    value={newPayment.payment_date}
                    onChange={(e) => handleNewPaymentInputChange('payment_date', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Referencia *</label>
                  <Input
                    value={newPayment.reference}
                    onChange={(e) => handleNewPaymentInputChange('reference', e.target.value)}
                    placeholder="Ej: REF-001"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Notas</label>
                  <textarea
                    value={newPayment.notes}
                    onChange={(e) => handleNewPaymentInputChange('notes', e.target.value)}
                    placeholder="Notas adicionales..."
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowNewPaymentModal(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreatePayment}
                  disabled={saving}
                >
                  {saving ? 'Creando...' : 'Crear Cobro'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Ver Detalles */}
        {showDetailsModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black border border-border shadow-lg rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#000000'}}>
              <h2 className="text-xl font-bold mb-4 text-text-primary">Detalles del Cobro</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Referencia</label>
                    <p className="text-text-primary font-medium">{selectedPayment.reference}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Factura</label>
                    <p className="text-text-primary font-medium">{selectedPayment.invoice_number || selectedPayment.invoice_id}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Cliente</label>
                  <p className="text-text-primary font-medium">{selectedPayment.customer_name || 'No especificado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Monto</label>
                    <p className="text-text-primary font-medium">${selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Método</label>
                    <p className="text-text-primary font-medium">{selectedPayment.payment_method}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Fecha</label>
                  <p className="text-text-primary font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-secondary">Estado</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPayment.status)}
                  </div>
                </div>
                {selectedPayment.notes && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-secondary">Notas</label>
                    <p className="text-text-primary">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedPayment(null);
                  }}
                >
                  Cerrar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditPayment(selectedPayment);
                  }}
                >
                  Editar Cobro
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

