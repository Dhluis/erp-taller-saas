'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FileText, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrdersViewTabs() {
  const pathname = usePathname();
  
  const tabs = [
    {
      name: 'Lista',
      href: '/ordenes',
      icon: FileText,
      isActive: pathname === '/ordenes',
    },
    {
      name: 'Kanban',
      href: '/ordenes/kanban',
      icon: LayoutGrid,
      isActive: pathname === '/ordenes/kanban',
    },
  ];

  return (
    <div className="border-b border-slate-700">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'group inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors',
                tab.isActive
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  tab.isActive
                    ? 'text-cyan-400'
                    : 'text-slate-500 group-hover:text-slate-400'
                )}
              />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}





