'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface TwilioStatusData {
  connected: boolean;
  phone: string | null;
  status: string;
}

interface WhatsAppTwilioStatusProps {
  organizationId?: string;
  onStatusChange?: (connected: boolean) => void;
  darkMode?: boolean;
  className?: string;
}

export function WhatsAppTwilioStatus({
  onStatusChange,
  darkMode = false,
  className = '',
}: WhatsAppTwilioStatusProps) {
  const router = useRouter();
  const [data, setData] = useState<TwilioStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/messaging/config');
        if (!res.ok) return;
        const json = await res.json();
        const config = json.config || json;
        const connected =
          config.whatsapp_enabled === true &&
          config.whatsapp_api_status === 'active';
        const status: TwilioStatusData = {
          connected,
          phone: config.whatsapp_api_number || null,
          status: config.whatsapp_api_status || 'inactive',
        };
        setData(status);
        onStatusChange?.(connected);
      } catch {
        setData({ connected: false, phone: null, status: 'error' });
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [onStatusChange]);

  const bg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const subtext = darkMode ? 'text-gray-400' : 'text-gray-500';

  if (loading) {
    return (
      <div className={`rounded-lg border p-6 ${bg} ${className}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-400" />
          <div className="h-4 bg-gray-400 rounded w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-6 ${bg} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {data?.connected ? (
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
          )}
          <div>
            <p className={`font-semibold ${text}`}>
              {data?.connected ? 'WhatsApp Business conectado' : 'WhatsApp Business no configurado'}
            </p>
            {data?.phone ? (
              <p className={`text-sm mt-0.5 ${subtext}`}>Número: {data.phone}</p>
            ) : (
              <p className={`text-sm mt-0.5 ${subtext}`}>
                Configura tu número Twilio para recibir y enviar mensajes
              </p>
            )}
          </div>
        </div>
        {!data?.connected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/whatsapp/setup-api')}
            className="shrink-0 gap-1"
          >
            Configurar
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
