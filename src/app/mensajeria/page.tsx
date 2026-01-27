'use client';

import React, { useEffect, useState } from 'react';
import { ChannelCard } from '@/components/messaging/ChannelCard';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface MessagingConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappProvider: 'waha' | 'twilio';
  whatsappEnabled: boolean;
}

export default function MessagingPage() {
  const [config, setConfig] = useState<MessagingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/messaging/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getEmailStatus = () => {
    if (!config) return 'not-configured';
    return config.emailEnabled ? 'active' : 'inactive';
  };

  const getSMSStatus = () => {
    if (!config) return 'not-configured';
    return config.smsEnabled ? 'active' : 'inactive';
  };

  const getWhatsAppStatus = () => {
    if (!config) return 'not-configured';
    if (config.whatsappProvider === 'twilio' && config.whatsappEnabled) return 'active';
    if (config.whatsappProvider === 'waha') return 'configured';
    return 'not-configured';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Mensajería', href: '/mensajeria' },
        ]}
      />

      {/* Header */}
      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-text-primary mb-2">💬 Mensajería</h1>
        <p className="text-text-secondary">
          Gestiona cómo te comunicas con tus clientes a través de Email, SMS y WhatsApp
        </p>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ChannelCard
          icon="📧"
          title="Email"
          description="Envía cotizaciones y notificaciones por correo electrónico"
          status={getEmailStatus()}
          href="/mensajeria/email"
        />

        <ChannelCard
          icon="📱"
          title="SMS"
          description="Notificaciones rápidas por mensaje de texto"
          status={getSMSStatus()}
          href="/mensajeria/sms"
        />

        <ChannelCard
          icon="💬"
          title="WhatsApp"
          description="Comunicación directa con clientes vía WhatsApp"
          status={getWhatsAppStatus()}
          href="/dashboard/whatsapp"
        />
      </div>

      {/* Info Card */}
      <Card className="border-info/50 bg-info/5">
        <CardHeader>
          <CardTitle className="text-info">ℹ️ Información sobre Mensajería</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-text-secondary">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">📧 Email</h3>
              <ul className="space-y-1">
                <li>• Ideal para cotizaciones detalladas</li>
                <li>• Sin límites de caracteres</li>
                <li>• Incluye archivos adjuntos</li>
                <li>• Gratis con SendGrid</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">📱 SMS</h3>
              <ul className="space-y-1">
                <li>• Notificaciones urgentes</li>
                <li>• Máximo 1600 caracteres</li>
                <li>• Formato automático +52</li>
                <li>• ~$0.15 MXN por mensaje</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">💬 WhatsApp</h3>
              <ul className="space-y-1">
                <li>• Plan Básico (WAHA) gratis</li>
                <li>• Plan Premium (Twilio) +$200/mes</li>
                <li>• Chatbot con IA incluido</li>
                <li>• Máxima confiabilidad</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

