'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/messaging/StatusBadge';
import { TestMessageModal } from '@/components/messaging/TestMessageModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { toast } from 'sonner';
import { Loader2, Check, AlertCircle, Star } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface WhatsAppConfig {
  whatsappProvider: 'twilio' | null;
  whatsappTwilioNumber: string | null;
  whatsappVerified: boolean;
  whatsappEnabled: boolean;
}

export default function WhatsAppConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/messaging/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
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

  const handleTest = async (data: { testValue: string }) => {
    const response = await fetch('/api/messaging/test/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testPhone: data.testValue }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar WhatsApp de prueba');
    }

    return await response.json();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isActive = config?.whatsappProvider === 'twilio' && config?.whatsappEnabled;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Mensajería', href: '/mensajeria' },
          { label: 'WhatsApp', href: '/mensajeria/whatsapp' },
        ]}
      />

      {/* Header */}
      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">💬 WhatsApp Business</h1>
            <p className="text-text-secondary">API oficial de Meta con Twilio</p>
          </div>
          <StatusBadge
            status={isActive ? 'success' : 'warning'}
            label={isActive ? '✓ Activo' : '⚠️ Sin configurar'}
          />
        </div>
      </div>

      {/* WhatsApp Business API - Twilio */}
      <Card className={`mb-6 ${isActive ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-warning" />
              <div>
                <CardTitle>WhatsApp Business API</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Conectado vía Twilio — canal oficial de Meta
                </p>
              </div>
            </div>
            {isActive && <StatusBadge status="success" label="✓ Activo" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>100% estable, nunca se desconecta</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Botones y listas interactivas</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Templates pre-aprobados por Meta</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Sin riesgo de baneo</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Chatbot con IA incluido</span>
            </div>
          </div>

          {isActive ? (
            <div className="bg-bg-tertiary border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                Número: <strong className="text-text-primary">{config?.whatsappTwilioNumber || 'No configurado'}</strong>
              </p>
              {config?.whatsappVerified && (
                <p className="text-xs text-success mt-1">✓ Verificado por Meta</p>
              )}
            </div>
          ) : (
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-sm font-medium text-text-primary mb-2">
                Configura tu número empresarial
              </p>
              <p className="text-xs text-text-secondary">
                Ve a la configuración para activar tu número WhatsApp Business.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTestModal(true)}
              disabled={!isActive}
            >
              {isActive ? 'Enviar prueba' : 'No disponible'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/whatsapp/setup-api')}
            >
              Configurar número
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Modal */}
      <TestMessageModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        channel="whatsapp"
        onSend={handleTest}
      />
    </div>
  );
}
