'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChannelCardProps {
  icon: string;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'configured' | 'not-configured';
  stats?: {
    sent?: number;
    rate?: number;
  };
  href: string;
}

export function ChannelCard({
  icon,
  title,
  description,
  status,
  stats,
  href,
}: ChannelCardProps) {
  const statusConfig = {
    active: { variant: 'success' as const, label: '✅ Activo' },
    inactive: { variant: 'secondary' as const, label: '⚫ Inactivo' },
    configured: { variant: 'info' as const, label: '⚙️ Configurado' },
    'not-configured': { variant: 'warning' as const, label: '⚠️ Sin configurar' },
  };

  const config = statusConfig[status];

  return (
    <Link href={href} className="block">
      <Card hover className="h-full">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <h3 className="font-semibold text-lg text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
              </div>
            </div>
            <Badge variant={config.variant} size="sm">
              {config.label}
            </Badge>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-6 pt-4 border-t border-border">
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
        </CardContent>
      </Card>
    </Link>
  );
}

