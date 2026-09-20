'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WhatsAppConversation } from './types';

interface ConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
  loading?: boolean;
}

function initials(name: string | null, phone: string): string {
  if (name && name.trim()) {
    return name.trim().slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
}

export function ConversationList({ conversations, selectedId, onSelect, loading }: ConversationListProps) {
  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Cargando conversaciones...</div>;
  }

  if (conversations.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No hay conversaciones todavía.</div>;
  }

  return (
    <div className="divide-y divide-border overflow-y-auto">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          onClick={() => onSelect(conversation)}
          className={cn(
            'w-full flex items-start gap-3 p-3 text-left hover:bg-bg-tertiary transition-colors',
            selectedId === conversation.id && 'bg-bg-tertiary'
          )}
        >
          <Avatar className="h-10 w-10 shrink-0">
            {conversation.profile_picture_url && <AvatarImage src={conversation.profile_picture_url} />}
            <AvatarFallback>{initials(conversation.customer_name, conversation.customer_phone)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">
                {conversation.customer_name || conversation.customer_phone}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatTime(conversation.last_message_at)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {conversation.last_message || 'Sin mensajes'}
            </p>
            {conversation.status && conversation.status !== 'open' && (
              <Badge variant="secondary" className="mt-1 text-[10px]">
                {conversation.status}
              </Badge>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
