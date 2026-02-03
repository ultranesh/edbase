'use client';

import { useState, useMemo } from 'react';
import type { CrmLead, PipelineStage } from '../CrmClient';

interface CrmTableViewProps {
  leads: CrmLead[];
  stages: PipelineStage[];
  onCardClick: (lead: CrmLead) => void;
  formatAmount: (amount: number) => string;
  t: (key: string) => string;
}

type SortField = 'name' | 'stage' | 'amount' | 'source' | 'createdAt' | 'phone';

export default function CrmTableView({ leads, stages, onCardClick, formatAmount, t }: CrmTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const stageMap = useMemo(() => {
    const m: Record<string, PipelineStage> = {};
    for (const s of stages) m[s.status] = s;
    return m;
  }, [stages]);

  const stageOrder: Record<string, number> = {
    NEW_APPLICATION: 0, INITIAL_CONTACT: 1, DIAGNOSTIC: 2, NEGOTIATION: 3,
    CONTRACT: 4, PAYMENT: 5, WON: 6, LOST: 7,
  };

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'ru');
          break;
        case 'stage':
          cmp = (stageOrder[a.stage] ?? 99) - (stageOrder[b.stage] ?? 99);
          break;
        case 'amount':
          cmp = (a.amount || 0) - (b.amount || 0);
          break;
        case 'source':
          cmp = (a.source || '').localeCompare(b.source || '');
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'phone':
          cmp = (a.phone || '').localeCompare(b.phone || '');
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [leads, sortField, sortDir]);

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
    >
      <span className={sortField === field ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
        {label}
        {sortField === field && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
      </span>
    </th>
  );

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {sorted.length === 0 ? (
        <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">{t('crm.noData')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <SortHeader field="name" label={t('crm.lastName')} />
                <SortHeader field="phone" label={t('crm.phone')} />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('crm.parentName')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('crm.parentPhone')}
                </th>
                <SortHeader field="stage" label={t('crm.stageChanged').split(' ')[0] || 'Stage'} />
                <SortHeader field="amount" label={t('crm.amount')} />
                <SortHeader field="source" label={t('crm.source')} />
                <SortHeader field="createdAt" label={t('crm.created')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sorted.map(lead => {
                const stage = stageMap[lead.stage];
                const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onCardClick(lead)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{initials}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {lead.lastName} {lead.firstName}
                        </span>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.phone || '—'}
                    </td>
                    {/* Parent Name */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.parentName || '—'}
                    </td>
                    {/* Parent Phone */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.parentPhone || '—'}
                    </td>
                    {/* Stage */}
                    <td className="px-4 py-3">
                      {stage && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stage.headerBg} ${stage.textClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stage.dotClass}`} />
                          {t(stage.labelKey)}
                        </span>
                      )}
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {lead.amount ? formatAmount(lead.amount) : '—'}
                    </td>
                    {/* Source */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.source || '—'}
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
