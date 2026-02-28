'use client';

import React, { useEffect, useState } from 'react';
import { ChannelCard } from '@/components/messaging/ChannelCard';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, MessageCircle, FileText, Paperclip, Bot, Shield, Zap, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MessagingConfig {
  emailEnabled: boolean;
  whatsappProvider: 'twilio' | null;
  whatsappEnabled: boolean;
  tier?: 'basic' | 'premium';
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

  const getWhatsAppStatus = () => {
    if (!config) return 'not-configured';
    if (config.whatsappProvider === 'twilio' && config.whatsappEnabled) return 'active';
    return 'not-configured';
  };

  return (
    <div className="p-6 pb-10 max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        currentPage="Mensajería"
        parentPages={[{ label: 'Inicio', href: '/dashboard' }]}
      />

      {/* Header: título y subtítulo con más presencia */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              Mensajería
            </h1>
            <p className="text-text-secondary text-sm sm:text-base mt-0.5">
              Gestiona cómo te comunicas con tus clientes por Email y WhatsApp
            </p>
          </div>
        </div>
      </header>

      {/* Canales: 2 columnas, tarjetas destacadas y proporcionales */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          Canales de comunicación
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChannelCard
            icon="📧"
            title="Email"
            description="Envía cotizaciones y notificaciones por correo electrónico"
            status={getEmailStatus()}
            href="/mensajeria/email"
            featured
          />
          <ChannelCard
            icon="💬"
            title="WhatsApp"
            description="Comunicación directa con clientes vía WhatsApp"
            status={getWhatsAppStatus()}
            href="/dashboard/whatsapp"
            featured
          />
        </div>
      </section>

      {/* Información: 2 columnas compactas + bloque de consejos */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-info/30 bg-info/5 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-info">
              <Info className="w-4 h-4" />
              Información sobre Mensajería
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-text-secondary">
              <div className="space-y-3">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary/80" />
                  Email
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <FileText className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>Ideal para cotizaciones detalladas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Sin límites de caracteres</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Paperclip className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>Incluye archivos adjuntos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>Gratis con Resend</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary/80" />
                  WhatsApp
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>WhatsApp Business API (Twilio)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bot className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>Chatbot con IA incluido</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>Sin riesgo de baneo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>Máxima confiabilidad</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloque derecho: qué puedes hacer */}
        <Card className="border-border bg-bg-secondary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-text-primary">
              Qué puedes hacer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 text-sm text-text-secondary">
            <p>
              Configura uno o ambos canales para enviar cotizaciones, recordatorios y notificaciones desde el taller.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Cotizaciones por email o WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Avisos de órdenes y cobros</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Conversaciones con clientes (WhatsApp)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
