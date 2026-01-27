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
  whatsappProvider: 'waha' | 'twilio';
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

  const isBasic = config?.whatsappProvider === 'waha';
  const isPremium = config?.whatsappProvider === 'twilio';
  const hasActivePlan = isBasic || isPremium;

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
            <h1 className="text-3xl font-bold text-text-primary mb-2">💬 Configuración de WhatsApp</h1>
            <p className="text-text-secondary">Elige cómo quieres usar WhatsApp con tus clientes</p>
          </div>
          <StatusBadge
            status={hasActivePlan ? 'success' : 'warning'}
            label={
              isBasic 
                ? '🟢 Plan Básico' 
                : isPremium 
                ? '⭐ Plan Premium' 
                : '⚠️ Sin configurar'
            }
          />
        </div>
      </div>

      {/* Plan Básico - WAHA */}
      <Card className={`mb-6 ${isBasic ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📱</span>
              <div>
                <CardTitle>Plan Básico - WAHA</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Conecta tu WhatsApp personal con código QR
                </p>
              </div>
            </div>
            {isBasic && (
              <StatusBadge status="success" label="✓ Activo" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Setup instantáneo (escanea QR)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Sin costos adicionales</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Usa tu número actual</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success" />
              <span>Chatbot con IA incluido</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span>Límites de cuenta personal</span>
            </div>
          </div>

          {isBasic ? (
            <div className="bg-bg-tertiary border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                Estado: <strong className="text-success">Conectado</strong>
              </p>
              <p className="text-xs text-text-muted mt-1">
                Tu WhatsApp está funcionando correctamente con WAHA
              </p>
            </div>
          ) : (
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                ℹ️ Este plan usa el sistema WAHA que ya tienes configurado
              </p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setShowTestModal(true)}
            disabled={!isBasic}
          >
            {isBasic ? 'Enviar prueba' : 'No disponible'}
          </Button>
        </CardContent>
      </Card>

      {/* Plan Premium - Twilio */}
      <Card className={`mb-6 ${isPremium ? 'border-warning/50 bg-warning/5' : 'border-border'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-warning" />
              <div>
                <CardTitle>Plan Premium - WhatsApp Business API</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  API oficial de Meta con Twilio
                </p>
              </div>
            </div>
            {isPremium && (
              <StatusBadge status="warning" label="⭐ Premium" />
            )}
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
              <span>Chatbot con IA mejorado</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span>Requiere verificación de Meta (1-2 semanas)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="text-warning">💰</span>
              <span>Costo: +$200 MXN/mes</span>
            </div>
          </div>

          {isPremium ? (
            <div className="bg-bg-tertiary border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                Número: <strong className="text-text-primary">{config?.whatsappTwilioNumber || 'No configurado'}</strong>
              </p>
              <p className="text-xs text-text-muted mt-1">
                WhatsApp Business API activo
                {config?.whatsappVerified && (
                  <span className="text-success ml-2">✓ Verificado</span>
                )}
              </p>
            </div>
          ) : (
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-sm font-medium text-text-primary mb-2">
                🚀 ¿Quieres hacer upgrade a Premium?
              </p>
              <p className="text-xs text-text-secondary">
                Contacta al soporte para iniciar el proceso de verificación con Meta y configurar tu número empresarial.
              </p>
            </div>
          )}

          <Button
            disabled={!isPremium}
            variant={isPremium ? 'primary' : 'outline'}
          >
            {isPremium ? 'Gestionar Premium' : 'Solicitar Upgrade'}
          </Button>
        </CardContent>
      </Card>

      {/* Comparación de Planes */}
      <Card className="border-info/50 bg-info/5">
        <CardHeader>
          <CardTitle className="text-info">ℹ️ Comparación de Planes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-text-primary mb-3">Plan Básico (WAHA)</h3>
              <ul className="space-y-2 text-text-secondary">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Gratis, siempre incluido</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Perfecto para empezar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Usa tu número actual</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Setup rápido con QR</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-3">Plan Premium (Twilio)</h3>
              <ul className="space-y-2 text-text-secondary">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Máxima confiabilidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Funciones avanzadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Número empresarial dedicado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Sin límites de cuenta</span>
                </li>
              </ul>
            </div>
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

