'use client';

import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { QuotationStatusBadge } from './QuotationStatusBadge';
import { 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  Send
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Quotation {
  id: string;
  quotationNumber: string;
  customer: {
    name: string;
    email: string;
  };
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  total: number;
  createdAt: string;
  validUntil: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface QuotationCardProps {
  quotation: Quotation;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSend: (id: string) => void;
}

export function QuotationCard({
  quotation,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onSend
}: QuotationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviada';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      case 'expired': return 'Expirada';
      default: return 'Desconocido';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            #{quotation.quotationNumber}
          </CardTitle>
          <QuotationStatusBadge status={quotation.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{quotation.customer.name}</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Creada</div>
              <div className="text-muted-foreground">
                {formatDate(quotation.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Válida hasta</div>
              <div className="text-muted-foreground">
                {formatDate(quotation.validUntil)}
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center gap-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5 text-primary" />
          <span>{formatCurrency(quotation.total)}</span>
        </div>

        {/* Items count */}
        <div className="text-sm text-muted-foreground">
          {quotation.items.length} {quotation.items.length === 1 ? 'item' : 'items'}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(quotation.id)}
            className="flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            Ver
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(quotation.id)}
            className="flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>

          {quotation.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSend(quotation.id)}
              className="flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(quotation.id)}
            className="flex items-center gap-1"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(quotation.id)}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}















