'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AlertCircle } from 'lucide-react';

interface MessageComposerProps {
  onSend: (text: string) => Promise<void>;
  outsideWindow: boolean;
}

export function MessageComposer({ onSend, outsideWindow }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const disabled = outsideWindow || sending;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  if (outsideWindow) {
    return (
      <div className="p-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground bg-bg-tertiary">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
        Han pasado más de 24h desde el último mensaje del cliente. Solo se pueden enviar plantillas aprobadas por Meta (disponible en una fase futura).
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Escribe una respuesta..."
        className="flex-1 min-h-[44px] max-h-32 resize-none"
        disabled={sending}
      />
      <Button onClick={handleSend} disabled={disabled || !text.trim()} size="icon">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
