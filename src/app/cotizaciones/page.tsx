'use client';

import { useEffect, useState } from 'react';

// Disable static generation
export const dynamic = 'force-dynamic';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, FileText } from 'lucide-react';
import { PageHeader } from '@/components/navigation/page-header';
import { useBilling } from '@/hooks/useBilling';
import { QuotationFilters } from '@/components/ui/QuotationFilters';
import { QuotationCard } from '@/components/ui/QuotationCard';
import { QuotationForm } from '@/components/ui/QuotationForm';
import { DeleteQuotationModal } from '@/components/ui/DeleteQuotationModal';
import { Quotation } from '@/hooks/useBilling';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BillingItemsManager } from '@/components/ui/BillingItemsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QuotationStatusBadge } from '@/components/ui/QuotationStatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, Car, Calendar, DollarSign, RefreshCw as ConvertIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function QuotationsPage() {
  const {
    quotations,
    currentQuotation,
    loading,
    fetchQuotations,
    searchQuotations,
    fetchQuotationById,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    updateQuotationStatus,
    addQuotationItem,
    updateQuotationItem,
    deleteQuotationItem,
    createInvoiceFromQuotation,
    setCurrentQuotation,
  } = useBilling();

  // Estados UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    fetchQuotations();
  }, []);

  // Manejar búsqueda
  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchQuotations(searchTerm);
    } else {
      fetchQuotations(selectedStatus !== 'all' ? selectedStatus : undefined);
    }
  };

  // Manejar cambio de filtro de estado
  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    if (status === 'all') {
      fetchQuotations();
    } else {
      fetchQuotations(status);
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    fetchQuotations();
  };

  // Refrescar datos
  const handleRefresh = () => {
    fetchQuotations(selectedStatus !== 'all' ? selectedStatus : undefined);
  };

  // Crear nueva cotización
  const handleCreateQuotation = () => {
    setEditingQuotation(null);
    setIsFormOpen(true);
  };

  // Ver detalles de cotización
  const handleViewDetails = async (quotation: Quotation) => {
    await fetchQuotationById(quotation.id);
    setIsDetailsOpen(true);
  };

  // Editar cotización
  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setIsFormOpen(true);
  };

  // Eliminar cotización
  const handleDeleteClick = (quotation: Quotation) => {
    setDeletingQuotation(quotation);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingQuotation) {
      await deleteQuotation(deletingQuotation.id);
      setIsDeleteModalOpen(false);
      setDeletingQuotation(null);
    }
  };

  // Cambiar estado de cotización
  const handleStatusChange = async (quotationId: string, newStatus: Quotation['status']) => {
    await updateQuotationStatus(quotationId, newStatus);
  };

  // Convertir a nota de venta
  const handleConvertToInvoice = async (quotation: Quotation) => {
    const result = await createInvoiceFromQuotation(quotation.id);
    if (result) {
      setIsDetailsOpen(false);
    }
  };

  // Submit formulario
  const handleFormSubmit = async (data: any) => {
    if (editingQuotation) {
      await updateQuotation(editingQuotation.id, data);
    } else {
      await createQuotation(data);
    }
  };

  // Agrupar cotizaciones por estado
  const groupedQuotations = {
    pending: quotations.filter((q) => q.status === 'pending'),
    approved: quotations.filter((q) => q.status === 'approved'),
    rejected: quotations.filter((q) => q.status === 'rejected'),
    converted: quotations.filter((q) => q.status === 'converted'),
    expired: quotations.filter((q) => q.status === 'expired'),
  };

  const totalQuotations = quotations.length;
  const totalAmount = quotations.reduce((sum, q) => sum + q.total_amount, 0);

  return (
    <AppLayout
      title="Cotizaciones"
      breadcrumbs={[{ label: 'Cotizaciones', href: '/cotizaciones' }]}
    >
      <div className="flex flex-col gap-6">
      {/* Page Header con Breadcrumbs */}
      <PageHeader
        title="Cotizaciones"
        description="Administra cotizaciones y presupuestos"
        breadcrumbs={[
          { label: 'Cotizaciones', href: '/cotizaciones' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
            <Button onClick={handleCreateQuotation}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </div>
        }
      />

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotations}</div>
            <p className="text-xs text-muted-foreground">
              ${totalAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {groupedQuotations.pending.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groupedQuotations.approved.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Convertidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {groupedQuotations.converted.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {groupedQuotations.rejected.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <QuotationFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusFilterChange}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
      />

      {/* Grid de cotizaciones */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quotations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay cotizaciones</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primera cotización para comenzar
            </p>
            <Button onClick={handleCreateQuotation}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quotations.map((quotation) => (
            <QuotationCard
              key={quotation.id}
              quotation={quotation}
              onView={handleViewDetails}
              onEdit={handleEditQuotation}
              onDelete={handleDeleteClick}
              onConvert={
                quotation.status === 'approved'
                  ? handleConvertToInvoice
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Formulario de cotización */}
      <QuotationForm
        quotation={editingQuotation}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQuotation(null);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={loading}
      />

      {/* Modal de detalles de cotización */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border border-border shadow-lg" style={{backgroundColor: '#000000'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles de la Cotización
            </DialogTitle>
            <DialogDescription>
              Información completa y gestión de items
            </DialogDescription>
          </DialogHeader>

          {currentQuotation && (
            <div className="space-y-6">
              {/* Información básica */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {currentQuotation.quotation_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {currentQuotation.description}
                      </p>
                    </div>
                    <QuotationStatusBadge status={currentQuotation.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Cliente */}
                    {currentQuotation.customer && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {currentQuotation.customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currentQuotation.customer.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Vehículo */}
                    {currentQuotation.vehicle && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {currentQuotation.vehicle.brand} {currentQuotation.vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currentQuotation.vehicle.year} - {currentQuotation.vehicle.license_plate}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fecha de validez */}
                  {currentQuotation.valid_until && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Válida hasta:{' '}
                        {format(new Date(currentQuotation.valid_until), 'dd MMM yyyy', {
                          locale: es,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Notas */}
                  {currentQuotation.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Notas:</p>
                      <p className="text-sm">{currentQuotation.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gestión de items */}
              <BillingItemsManager
                items={currentQuotation.items || []}
                onAddItem={async (itemData) => {
                  await addQuotationItem(currentQuotation.id, itemData);
                }}
                onUpdateItem={async (itemId, data) => {
                  await updateQuotationItem(itemId, data);
                }}
                onDeleteItem={async (itemId) => {
                  await deleteQuotationItem(itemId);
                }}
                isLoading={loading}
              />

              {/* Resumen financiero */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen Financiero</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${currentQuotation.subtotal.toFixed(2)}</span>
                    </div>
                    {currentQuotation.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento:</span>
                        <span>-${currentQuotation.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Impuestos:</span>
                      <span>${currentQuotation.tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-cyan-600">
                        ${currentQuotation.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Acciones */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingQuotation(currentQuotation);
                    setIsFormOpen(true);
                    setIsDetailsOpen(false);
                  }}
                >
                  Editar
                </Button>
                {currentQuotation.status === 'approved' && (
                  <Button
                    onClick={() => handleConvertToInvoice(currentQuotation)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ConvertIcon className="h-4 w-4 mr-2" />
                    Convertir a Nota de Venta
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <DeleteQuotationModal
        quotation={deletingQuotation}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingQuotation(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={loading}
      />
    </div>
    </AppLayout>
  );
}
