'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/lib/context/SessionContext';
import { ChannelCard } from '@/components/messaging/ChannelCard';
import { Loader2 } from 'lucide-react';

interface MessagingStats {
  channels: {
    email: { enabled: boolean; configured: boolean };
    sms: { enabled: boolean; configured: boolean };
    whatsapp: { provider: string; enabled: boolean; configured: boolean };
  };
  usage: {
    emailsSent: number;
    smsSent: number;
    whatsappSent: number;
  };
}

export default function MensajeriaPage() {
  const { profile, organizationId } = useSession();
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadStats();
    }
  }, [organizationId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/messaging/stats');
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const getChannelStatus = (enabled: boolean, configured: boolean) => {
    if (!configured) return 'not-configured';
    if (enabled) return 'active';
    return 'inactive';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-text-secondary">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error}</p>
          <button
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-error text-white rounded-md hover:bg-error-dark transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">📨 Mensajería</h1>
        <p className="text-text-secondary">
          Gestiona cómo te comunicas con tus clientes a través de Email, SMS y WhatsApp
        </p>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Email */}
        <ChannelCard
          icon="📧"
          title="Email"
          description="Envía cotizaciones y actualizaciones"
          status={getChannelStatus(
            stats?.channels.email.enabled || false,
            stats?.channels.email.configured || false
          )}
          stats={{
            sent: stats?.usage.emailsSent || 0,
            rate: 98,
          }}
          href="/mensajeria/email"
        />

        {/* SMS */}
        <ChannelCard
          icon="📱"
          title="SMS"
          description="Notificaciones rápidas por mensaje"
          status={getChannelStatus(
            stats?.channels.sms.enabled || false,
            stats?.channels.sms.configured || false
          )}
          stats={{
            sent: stats?.usage.smsSent || 0,
            rate: 95,
          }}
          href="/mensajeria/sms"
        />

        {/* WhatsApp */}
        <ChannelCard
          icon="💬"
          title="WhatsApp"
          description={`Conversaciones con clientes (${stats?.channels.whatsapp.provider === 'twilio' ? 'Premium' : 'Básico'})`}
          status={getChannelStatus(
            stats?.channels.whatsapp.enabled || false,
            stats?.channels.whatsapp.configured || false
          )}
          stats={{
            sent: stats?.usage.whatsappSent || 0,
          }}
          href="/mensajeria/whatsapp"
        />
      </div>

      {/* Quick Info */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-info mb-1">¿Necesitas ayuda?</h3>
            <p className="text-sm text-text-secondary">
              Cada canal tiene su propia configuración. Haz click en cualquier tarjeta para configurar ese canal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

