'use client';

import { Badge } from './badge';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle
} from 'lucide-react';

interface QuotationStatusBadgeProps {
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  size?: 'sm' | 'md' | 'lg';
}

export function QuotationStatusBadge({ status, size = 'md' }: QuotationStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Borrador',
          variant: 'secondary' as const,
          icon: FileText,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        };
      case 'sent':
        return {
          label: 'Enviada',
          variant: 'default' as const,
          icon: Send,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
      case 'approved':
        return {
          label: 'Aprobada',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 hover:bg-green-200'
        };
      case 'rejected':
        return {
          label: 'Rechazada',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-800 hover:bg-red-200'
        };
      case 'expired':
        return {
          label: 'Expirada',
          variant: 'outline' as const,
          icon: AlertTriangle,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
        };
      default:
        return {
          label: 'Desconocido',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1`}
    >
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
      {config.label}
    </Badge>
  );
}
















