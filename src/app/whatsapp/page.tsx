'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/context/SessionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ConversationThread } from '@/components/whatsapp/ConversationThread';
import { MessageComposer } from '@/components/whatsapp/MessageComposer';
import { AssignConversationSelect } from '@/components/whatsapp/AssignConversationSelect';
import type { WhatsAppConversation, WhatsAppMessage } from '@/components/whatsapp/types';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export default function WhatsAppPage() {
  const { organizationId } = useSession();
  const permissions = usePermissions();

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [lastInboundMessageAt, setLastInboundMessageAt] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/whatsapp/conversations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.data.items);
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      setLoadingList(false);
    }
  }, [search]);

  const loadConversationDetail = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelected(data.data.conversation);
        setMessages(data.data.messages);
        setLastInboundMessageAt(data.data.lastInboundMessageAt);
      }
    } catch (error) {
      console.error('Error cargando conversación:', error);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (organizationId) loadConversations();
  }, [organizationId, loadConversations]);

  // Realtime: refresca la lista y, si corresponde, el hilo abierto
  useEffect(() => {
    if (!organizationId) return;
    const client = getSupabaseClient();
    const channel = client
      .channel(`whatsapp-inbox-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations', filter: `organization_id=eq.${organizationId}` },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `organization_id=eq.${organizationId}` },
        (payload: any) => {
          if (selected && payload.new?.conversation_id === selected.id) {
            loadConversationDetail(selected.id);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, selected?.id]);

  const handleSelect = (conversation: WhatsAppConversation) => {
    loadConversationDetail(conversation.id);
  };

  const handleAssign = async (userId: string | null) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/whatsapp/conversations/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_user_id: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSelected(data.data);
      loadConversations();
      toast.success(userId ? 'Conversación asignada' : 'Asignación removida');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar la asignación');
    }
  };

  const handleSend = async (text: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/whatsapp/conversations/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'No se pudo enviar el mensaje');
        return;
      }
      loadConversationDetail(selected.id);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo enviar el mensaje');
    }
  };

  if (!permissions.canRead('whatsapp')) {
    return (
      <div className="flex-1 p-8">
        <p className="text-muted-foreground">No tenés permisos para ver la bandeja de WhatsApp.</p>
      </div>
    );
  }

  const outsideWindow = lastInboundMessageAt
    ? Date.now() - new Date(lastInboundMessageAt).getTime() > TWENTY_FOUR_HOURS_MS
    : false;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 py-3 border-b border-border">
        <StandardBreadcrumbs currentPage="WhatsApp" />
        <h1 className="text-xl font-bold mt-1">Bandeja de WhatsApp</h1>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Lista de conversaciones */}
        <div className="w-full max-w-sm border-r border-border flex flex-col min-h-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadConversations()}
                placeholder="Buscar por nombre o teléfono..."
                className="pl-8"
              />
            </div>
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id || null}
            onSelect={handleSelect}
            loading={loadingList}
          />
        </div>

        {/* Hilo de la conversación seleccionada */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Seleccioná una conversación para ver los mensajes.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{selected.customer_name || selected.customer_phone}</p>
                  <p className="text-xs text-muted-foreground">{selected.customer_phone}</p>
                </div>
                <AssignConversationSelect value={selected.assigned_to_user_id} onAssign={handleAssign} />
              </div>
              <ConversationThread messages={messages} loading={loadingThread} />
              <MessageComposer onSend={handleSend} outsideWindow={outsideWindow} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
