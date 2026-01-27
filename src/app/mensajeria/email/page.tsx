'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/messaging/StatusBadge';
import { TestMessageModal } from '@/components/messaging/TestMessageModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface EmailConfig {
  emailEnabled: boolean;
  emailFromName: string;
  emailReplyTo: string | null;
}

export default function EmailConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Form state
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/messaging/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setFromName(data.config.emailFromName || 'Mi Taller');
        setReplyTo(data.config.emailReplyTo || '');
        setEnabled(data.config.emailEnabled ?? true);
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
    // Validación básica
    if (!fromName.trim()) {
      toast.error('El nombre del remitente es requerido');
      return;
    }

    if (replyTo && !replyTo.includes('@')) {
      toast.error('El email de respuesta debe ser válido');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/messaging/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: enabled,
          emailFromName: fromName.trim(),
          emailReplyTo: replyTo.trim() || null,
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

  const handleTest = async (data: { testValue: string }) => {
    const response = await fetch('/api/messaging/test/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testEmail: data.testValue }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar email de prueba');
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Mensajería', href: '/mensajeria' },
          { label: 'Email', href: '/mensajeria/email' },
        ]}
      />

      {/* Header */}
      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">📧 Configuración de Email</h1>
            <p className="text-text-secondary">Configura cómo se envían los emails a tus clientes</p>
          </div>
          <StatusBadge
            status={enabled ? 'success' : 'warning'}
            label={enabled ? '✅ Activo' : '⚠️ Desactivado'}
          />
        </div>
      </div>

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
              id="email-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <label htmlFor="email-enabled" className="block font-medium text-text-primary cursor-pointer">
                Habilitar email
              </label>
              <p className="text-sm text-text-secondary mt-1">
                Permite enviar emails a clientes desde el sistema
              </p>
            </div>
          </div>

          {/* From Name */}
          <div className="space-y-2">
            <Label htmlFor="from-name" required>
              Nombre del remitente
            </Label>
            <Input
              id="from-name"
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Ej: Taller Mecánico Pérez"
            />
            <p className="text-xs text-text-muted">
              Nombre que aparecerá como remitente en los emails enviados
            </p>
          </div>

          {/* Reply To */}
          <div className="space-y-2">
            <Label htmlFor="reply-to">
              Email de respuesta (opcional)
            </Label>
            <Input
              id="reply-to"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="contacto@mitaller.com"
            />
            <p className="text-xs text-text-muted">
              Cuando los clientes respondan a los emails, llegarán a esta dirección
            </p>
          </div>

          {/* Preview */}
          <div className="bg-bg-tertiary border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2 text-text-primary">Vista previa</h3>
            <div className="text-sm text-text-secondary space-y-1">
              <p>
                De: <strong className="text-text-primary">{fromName || 'Mi Taller'}</strong>{' '}
                &lt;{process.env.NEXT_PUBLIC_SMTP_FROM_EMAIL || 'noreply@eaglessystem.io'}&gt;
              </p>
              <p>
                Responder a: {replyTo ? (
                  <strong className="text-text-primary">{replyTo}</strong>
                ) : (
                  <span className="text-text-muted">No configurado</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving || !fromName.trim()}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTestModal(true)}
              disabled={!enabled}
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
            <span>Información sobre Email</span>
          </h3>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                Los emails se envían desde{' '}
                <strong className="text-text-primary">
                  {process.env.NEXT_PUBLIC_SMTP_FROM_EMAIL || 'noreply@eaglessystem.io'}
                </strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Las respuestas de clientes van al email configurado arriba (si está configurado)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Compatible con templates de cotizaciones existentes</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Los emails se envían a través de SendGrid (Twilio)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Test Modal */}
      <TestMessageModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        channel="email"
        onSend={handleTest}
      />
    </div>
  );
}

