'use client';

import { useDroppable } from '@dnd-kit/core';
import CrmKanbanCard from './CrmKanbanCard';
import type { CrmLead, PipelineStage } from '../CrmClient';

interface CrmKanbanColumnProps {
  stage: PipelineStage;
  leads: CrmLead[];
  onCardClick: (lead: CrmLead) => void;
  formatAmount: (amount: number) => string;
  t: (key: string) => string;
  isDragging: boolean;
  waUnreadMap?: Record<string, number>;
  socialUnreadMap?: Record<string, number>;
}

export default function CrmKanbanColumn({
  stage,
  leads,
  onCardClick,
  formatAmount,
  t,
  isDragging,
  waUnreadMap,
  socialUnreadMap,
}: CrmKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.status });

  const totalAmount = leads.reduce((sum, l) => sum + (l.amount || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[260px] w-[260px] h-full flex flex-col rounded-t-xl transition-colors shrink-0 border-t border-x ${
        isOver
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
          : isDragging
            ? `border-dashed ${stage.borderClass}`
            : stage.borderClass
      }`}
    >
      {/* Column Header */}
      <div className={`px-3 py-2 rounded-t-xl ${stage.headerBg} border-b ${stage.borderClass} shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${stage.dotClass}`} />
            <span className={`text-sm font-semibold ${stage.textClass}`}>{stage.label || t(stage.labelKey)}</span>
          </div>
          <span className={`text-xs font-medium ${stage.textClass} bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full`}>
            {leads.length}
          </span>
        </div>
        {totalAmount > 0 && (
          <div className={`mt-0.5 text-xs ${stage.textClass} font-medium opacity-80`}>
            {formatAmount(totalAmount)}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className={`flex-1 min-h-0 relative ${stage.bgClass}`}>
        <div
          className="kanban-scroll overflow-y-auto h-full p-1.5 space-y-1.5 pb-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.kanban-scroll::-webkit-scrollbar { display: none; }`}</style>
          {leads.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
              {t('crm.noData')}
            </div>
          ) : (
            leads.map(lead => (
              <CrmKanbanCard
                key={lead.id}
                lead={lead}
                onCardClick={onCardClick}
                formatAmount={formatAmount}
                waUnreadCount={waUnreadMap?.[lead.id] || 0}
                socialUnreadCount={socialUnreadMap?.[lead.id] || 0}
              />
            ))
          )}
        </div>
        {/* Bottom fade gradient */}
        {leads.length > 3 && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-100/90 dark:from-gray-800/90 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
