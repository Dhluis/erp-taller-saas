'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirige /cobros a /ingresos/cobros (módulo unificado de cobros)
 */
export default function CobrosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ingresos/cobros');
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirigiendo a Cobros...</p>
      </div>
    </div>
  );
}

