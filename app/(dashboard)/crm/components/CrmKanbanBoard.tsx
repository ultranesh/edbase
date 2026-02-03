'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import CrmKanbanCard from './CrmKanbanCard';
import CrmKanbanColumn from './CrmKanbanColumn';
import type { CrmLead, PipelineStage } from '../CrmClient';

interface CrmKanbanBoardProps {
  leadsByStage: Record<string, CrmLead[]>;
  stages: PipelineStage[];
  onStageChange: (leadId: string, fromStage: string, toStage: string) => void;
  onCardClick: (lead: CrmLead) => void;
  formatAmount: (amount: number) => string;
  t: (key: string) => string;
  waUnreadMap?: Record<string, number>;
  socialUnreadMap?: Record<string, number>;
}

export default function CrmKanbanBoard({
  leadsByStage,
  stages,
  onStageChange,
  onCardClick,
  formatAmount,
  t,
  waUnreadMap,
  socialUnreadMap,
}: CrmKanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const findLeadById = useCallback((id: string): CrmLead | null => {
    for (const leads of Object.values(leadsByStage)) {
      const found = leads.find(l => l.id === id);
      if (found) return found;
    }
    return null;
  }, [leadsByStage]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = findLeadById(event.active.id as string);
    setActiveLead(lead);
  }, [findLeadById]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const lead = findLeadById(leadId);
    if (!lead) return;

    const toStage = over.id as string;
    const fromStage = lead.stage;

    if (fromStage !== toStage) {
      onStageChange(leadId, fromStage, toStage);
    }
  }, [findLeadById, onStageChange]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto scrollbar-hide" style={{ minHeight: 'calc(100vh - 340px)' }}>
        {stages.map(stage => (
          <CrmKanbanColumn
            key={stage.status}
            stage={stage}
            leads={leadsByStage[stage.status] || []}
            onCardClick={onCardClick}
            formatAmount={formatAmount}
            t={t}
            isDragging={!!activeLead}
            waUnreadMap={waUnreadMap}
            socialUnreadMap={socialUnreadMap}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead && (
          <div className="rotate-2 opacity-90">
            <CrmKanbanCard
              lead={activeLead}
              onCardClick={() => {}}
              formatAmount={formatAmount}
              isOverlay
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
