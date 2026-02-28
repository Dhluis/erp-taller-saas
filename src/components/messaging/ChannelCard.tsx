'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface ChannelCardProps {
  icon: string | ReactNode;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'configured' | 'not-configured';
  stats?: {
    sent?: number;
    rate?: number;
  };
  href: string;
  /** Tamaño más grande para destacar en la página principal */
  featured?: boolean;
}

export function ChannelCard({
  icon,
  title,
  description,
  status,
  stats,
  href,
  featured = false,
}: ChannelCardProps) {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Activo' },
    inactive: { variant: 'secondary' as const, label: 'Inactivo' },
    configured: { variant: 'info' as const, label: 'Configurado' },
    'not-configured': { variant: 'warning' as const, label: 'Sin configurar' },
  };

  const config = statusConfig[status];

  return (
    <Link href={href} className="block h-full">
      <Card hover className={featured ? 'h-full min-h-[200px]' : 'h-full'}>
        <CardContent className={featured ? 'p-6 sm:p-8' : 'p-6'}>
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className={featured ? 'flex items-center gap-4' : 'flex items-center gap-3'}>
                <div className={`flex items-center justify-center rounded-xl bg-bg-tertiary border border-border ${featured ? 'w-14 h-14' : 'w-11 h-11'}`}>
                  {typeof icon === 'string' ? <span className={featured ? 'text-2xl' : 'text-xl'}>{icon}</span> : <span className={featured ? 'scale-125' : ''}>{icon}</span>}
                </div>
                <div className="min-w-0">
                  <h3 className={`font-semibold text-text-primary ${featured ? 'text-xl' : 'text-lg'}`}>{title}</h3>
                  <p className={`text-text-secondary mt-1 ${featured ? 'text-base' : 'text-sm'}`}>{description}</p>
                </div>
              </div>
              <Badge variant={config.variant} size="sm" className="shrink-0">
                {config.label}
              </Badge>
            </div>
            {stats && (
              <div className="flex gap-6 pt-4 mt-auto border-t border-border">
                {stats.sent !== undefined && (
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.sent.toLocaleString()}</p>
                    <p className="text-xs text-text-secondary">Enviados</p>
                  </div>
                )}
                {stats.rate !== undefined && (
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.rate}%</p>
                    <p className="text-xs text-text-secondary">Tasa de entrega</p>
                  </div>
                )}
              </div>
            )}
            {featured && (
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-primary text-sm font-medium">
                <span>Configurar canal</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

