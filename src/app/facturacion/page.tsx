'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FacturacionRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la página correcta de facturación
    router.replace('/ingresos/facturacion');
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirigiendo a facturación...</p>
      </div>
    </div>
  );
}










