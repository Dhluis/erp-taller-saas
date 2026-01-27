'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface TestMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: 'email' | 'sms' | 'whatsapp';
  onSend: (data: { testValue: string }) => Promise<void>;
}

export function TestMessageModal({
  isOpen,
  onClose,
  channel,
  onSend,
}: TestMessageModalProps) {
  const [testValue, setTestValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!testValue.trim()) {
      toast.error('Por favor ingresa un valor válido');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await onSend({ testValue: testValue.trim() });
      setResult({ success: true, message: 'Mensaje de prueba enviado exitosamente' });
      toast.success('Mensaje de prueba enviado');
      // Limpiar después de 2 segundos
      setTimeout(() => {
        setTestValue('');
        setResult(null);
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.message || 'Error al enviar mensaje';
      setResult({ success: false, message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTestValue('');
    setResult(null);
    onClose();
  };

  const getPlaceholder = () => {
    switch (channel) {
      case 'email':
        return 'correo@ejemplo.com';
      case 'sms':
        return '+52 81 1234 5678';
      case 'whatsapp':
        return '+52 81 1234 5678';
    }
  };

  const getLabel = () => {
    switch (channel) {
      case 'email':
        return 'Email de prueba';
      case 'sms':
        return 'Número de teléfono';
      case 'whatsapp':
        return 'Número de WhatsApp';
    }
  };

  const getInputType = () => {
    switch (channel) {
      case 'email':
        return 'email';
      case 'sms':
      case 'whatsapp':
        return 'tel';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar mensaje de prueba</DialogTitle>
          <DialogDescription>
            Envía un mensaje de prueba para verificar que tu configuración funciona correctamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="test-value">{getLabel()}</Label>
            <Input
              id="test-value"
              type={getInputType()}
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder={getPlaceholder()}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && testValue.trim()) {
                  handleSend();
                }
              }}
            />
          </div>

          {/* Result */}
          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.success
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-error/10 text-error border border-error/20'
              }`}
            >
              <p>{result.message}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!testValue.trim() || loading}
          >
            {loading ? 'Enviando...' : 'Enviar prueba'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

