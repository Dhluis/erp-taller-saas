'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { WhatsAppMessage } from './types';

interface ConversationThreadProps {
  messages: WhatsAppMessage[];
  loading?: boolean;
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function ConversationThread({ messages, loading }: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return <div className="flex-1 p-4 text-sm text-muted-foreground">Cargando mensajes...</div>;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
          <div
            className={cn(
              'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
              msg.direction === 'outbound'
                ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white'
                : 'bg-bg-tertiary text-text-primary border border-border'
            )}
          >
            <p className="whitespace-pre-wrap">{msg.body}</p>
            <span className={cn('block text-[10px] mt-1', msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground')}>
              {formatTime(msg.sent_at || msg.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
