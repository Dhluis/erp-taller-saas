'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getOrganizationId } from '@/lib/auth/organization-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function MigrateCustomersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    customersUpdated?: number;
  } | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(true);

  const checkCurrentOrgId = async () => {
    try {
      const orgId = await getOrganizationId();
      setCurrentOrgId(orgId);
    } catch (error) {
      console.error('Error obteniendo organization_id:', error);
    }
  };

  const handleMigrate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          customersUpdated: data.customersUpdated,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Error desconocido durante la migración',
        });
      }
    } catch (error) {
      console.error('Error en migración:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido durante la migración',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentOrgId();
    if (autoRun) {
      handleMigrate();
      setAutoRun(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Migración de Clientes</h1>

      <div className="space-y-6">
        {/* Verificar organization_id actual */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Organization ID Actual</h2>
          <div className="flex items-center gap-4">
            <Button onClick={checkCurrentOrgId} variant="outline">
              Verificar Organization ID
            </Button>
            {currentOrgId && (
              <code className="text-cyan-400 bg-slate-900 px-3 py-2 rounded">
                {currentOrgId}
              </code>
            )}
          </div>
        </div>

        {/* Información sobre la migración */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">¿Qué hace esta migración?</h2>
          <ul className="space-y-2 text-slate-300">
            <li>• Actualiza todos los clientes con el organization_id antiguo</li>
            <li>• Los actualiza al organization_id correcto de tu usuario</li>
            <li>• Esto permite que todos los clientes aparezcan correctamente</li>
            <li>• Solo se ejecuta una vez</li>
          </ul>
        </div>

        {/* Resultado */}
        {result && (
          <Alert
            className={result.success ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
            <AlertDescription className={result.success ? 'text-green-300' : 'text-red-300'}>
              {result.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Botón de migración */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <Button
            onClick={handleMigrate}
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrando...
              </>
            ) : (
              'Ejecutar Migración'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

