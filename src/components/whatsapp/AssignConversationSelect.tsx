'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle2 } from 'lucide-react';
import type { TeamMember } from './types';

interface AssignConversationSelectProps {
  value: string | null;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

const UNASSIGNED = '__unassigned__';

export function AssignConversationSelect({ value, onAssign, disabled }: AssignConversationSelectProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.users || data?.data || [];
        setMembers(list);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select
      value={value || UNASSIGNED}
      onValueChange={(v) => onAssign(v === UNASSIGNED ? null : v)}
      disabled={disabled || loading}
    >
      <SelectTrigger size="sm" className="w-[180px]">
        <UserCircle2 className="h-4 w-4 mr-1 shrink-0" />
        <SelectValue placeholder="Sin asignar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.full_name || m.name || m.email || 'Usuario'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
