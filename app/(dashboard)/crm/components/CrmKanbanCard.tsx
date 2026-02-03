'use client';

import { useDraggable } from '@dnd-kit/core';
import type { CrmLead } from '../CrmClient';

interface CrmKanbanCardProps {
  lead: CrmLead;
  onCardClick: (lead: CrmLead) => void;
  formatAmount: (amount: number) => string;
  isOverlay?: boolean;
  waUnreadCount?: number;
  socialUnreadCount?: number;
}

export default function CrmKanbanCard({ lead, onCardClick, formatAmount, isOverlay, waUnreadCount = 0, socialUnreadCount = 0 }: CrmKanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: isOverlay,
  });

  const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`;
  const phone = lead.phone || lead.parentPhone || '';
  const date = new Date(lead.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      onClick={() => !isDragging && onCardClick(lead)}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-30' : ''
      } ${isOverlay ? 'shadow-xl' : ''}`}
    >
      {/* Name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 relative">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{initials}</span>
          {(waUnreadCount > 0 || socialUnreadCount > 0) && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-sm">
              {waUnreadCount + socialUnreadCount}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {lead.lastName} {lead.firstName}
            </span>
            {/* Platform unread indicators */}
            {waUnreadCount > 0 && (
              <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            )}
            {socialUnreadCount > 0 && (
              <svg className="w-3.5 h-3.5 text-[#E1306C] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.16.15.26.37.27.6l.05 1.88c.02.62.67 1.03 1.24.78l2.1-.93c.18-.08.38-.1.57-.06.9.25 1.86.38 2.62.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Phone */}
      {phone && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="truncate">{phone}</span>
        </div>
      )}

      {/* Amount + Date */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {lead.amount ? formatAmount(lead.amount) : '—'}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{date}</span>
      </div>

      {/* Source + Language tags */}
      {(lead.source || lead.language) && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {lead.source && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
              {lead.source}
            </span>
          )}
          {lead.language && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 font-medium">
              {lead.language}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
