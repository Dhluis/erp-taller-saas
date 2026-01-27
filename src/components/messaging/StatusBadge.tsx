'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info';
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const variantMap = {
    success: 'success' as const,
    error: 'error' as const,
    warning: 'warning' as const,
    info: 'info' as const,
  };

  return (
    <Badge variant={variantMap[status]} size={size}>
      {label}
    </Badge>
  );
}

