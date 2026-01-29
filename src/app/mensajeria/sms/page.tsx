'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/messaging/StatusBadge';
import { TestMessageModal } from '@/components/messaging/TestMessageModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SMSConfig {
  smsEnabled: boolean;
  smsFromNumber: string | null;
  smsAutoNotifications?: boolean;
  smsNotificationStatuses?: string[];
}

export default function SMSConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [autoNotifications, setAutoNotifications] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/messaging/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setEnabled(data.config.smsEnabled ?? false);
        setAutoNotifications(data.config.smsAutoNotifications ?? false);
      } else {
        toast.error('Error al cargar configuración');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/messaging/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_enabled: enabled,
          sms_auto_notifications: autoNotifications,
        }),
      });

      if (response.ok) {
        toast.success('✅ Configuración guardada exitosamente');
        loadConfig();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateSMS = async () => {
    setActivating(true);
    try {
      const response = await fetch('/api/messaging/activate-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ SMS activado exitosamente! Número: ${result.phoneNumber}`);
        loadConfig(); // Recargar configuración
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al activar SMS');
      }
    } catch (error: any) {
      console.error('Error activating SMS:', error);
      toast.error('Error al activar SMS');
    } finally {
      setActivating(false);
    }
  };

  const handleTest = async (data: { testValue: string }) => {
    const response = await fetch('/api/messaging/test/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testPhone: data.testValue }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar SMS de prueba');
    }

    const result = await response.json();
    return result;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConfigured = !!config?.smsFromNumber;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Mensajería', href: '/mensajeria' },
          { label: 'SMS', href: '/mensajeria/sms' },
        ]}
      />

      {/* Header */}
      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">📱 Configuración de SMS</h1>
            <p className="text-text-secondary">Envía notificaciones rápidas por mensaje de texto</p>
          </div>
          <StatusBadge
            status={enabled && isConfigured ? 'success' : 'warning'}
            label={enabled && isConfigured ? '✅ Activo' : '⚠️ No disponible'}
          />
        </div>
      </div>

      {/* Activar SMS si no está configurado */}
      {!isConfigured && (
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-1">Activar SMS Automático</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Activa SMS con un solo clic. El sistema comprará automáticamente un número de teléfono en México y configurará todo lo necesario.
                </p>
                <Button
                  onClick={handleActivateSMS}
                  disabled={activating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {activating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Activando...
                    </>
                  ) : (
                    '🚀 Activar SMS Automático'
                  )}
                </Button>
                <p className="text-xs text-text-muted mt-3">
                  Costo: ~$1 USD/mes por número + $0.15 MXN por SMS enviado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="sms-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!isConfigured}
              className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              <label htmlFor="sms-enabled" className="block font-medium text-text-primary cursor-pointer">
                Habilitar SMS
              </label>
              <p className="text-sm text-text-secondary mt-1">
                Permite enviar SMS a clientes desde el sistema
              </p>
            </div>
          </div>

          {/* Status */}
          {isConfigured && (
            <div className="bg-bg-tertiary border border-border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-text-primary">Estado de configuración</h3>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>
                    Número configurado: <strong className="text-text-primary">{config?.smsFromNumber}</strong>
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Los SMS se enviarán desde este número de Twilio
                  </p>
                </div>
              </div>

              {/* Auto Notifications */}
              <div className="flex items-start gap-3 pt-3 border-t border-border">
                <input
                  type="checkbox"
                  id="auto-notifications"
                  checked={autoNotifications}
                  onChange={(e) => setAutoNotifications(e.target.checked)}
                  disabled={!enabled}
                  className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <label htmlFor="auto-notifications" className="block font-medium text-text-primary cursor-pointer">
                    Notificaciones Automáticas
                  </label>
                  <p className="text-sm text-text-secondary mt-1">
                    Enviar SMS automáticamente cuando una orden cambia a "Listo" o "Completada"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving || !isConfigured}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTestModal(true)}
              disabled={!isConfigured || !enabled}
            >
              Enviar prueba
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-info/50 bg-info/5">
        <CardContent className="p-6">
          <h3 className="font-semibold text-info mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>Información sobre SMS</span>
          </h3>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Costo aproximado: <strong className="text-text-primary">$0.15 MXN</strong> por mensaje</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Ideal para notificaciones urgentes ("Tu carro está listo")</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Máximo <strong className="text-text-primary">1600 caracteres</strong> por mensaje</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Formato automático para números mexicanos (+52)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Test Modal */}
      <TestMessageModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        channel="sms"
        onSend={handleTest}
      />
    </div>
  );
}

