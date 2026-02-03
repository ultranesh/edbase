'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import CrmKanbanBoard from './components/CrmKanbanBoard';
import CrmTableView from './components/CrmTableView';
import CrmLeadSlideOver from './components/CrmLeadSlideOver';
import CrmLeadFormModal from './components/CrmLeadFormModal';
import CrmSettingsModal from './components/CrmSettingsModal';

export interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  parentName: string | null;
  parentPhone: string | null;
  source: string | null;
  stage: string;
  amount: number | null;
  description: string | null;
  lostReason: string | null;
  language: string | null;
  coordinatorId: string | null;
  coordinator: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  status: string;
  labelKey: string;
  dotClass: string;
  headerBg: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { status: 'NEW_APPLICATION', labelKey: 'crm.stageNewApplication', dotClass: 'bg-amber-500', headerBg: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', borderClass: 'border-amber-200 dark:border-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-900/10' },
  { status: 'INITIAL_CONTACT', labelKey: 'crm.stageInitialContact', dotClass: 'bg-blue-500', headerBg: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300', borderClass: 'border-blue-200 dark:border-blue-700', bgClass: 'bg-blue-50 dark:bg-blue-900/10' },
  { status: 'DIAGNOSTIC', labelKey: 'crm.stageDiagnostic', dotClass: 'bg-indigo-500', headerBg: 'bg-indigo-100 dark:bg-indigo-900/30', textClass: 'text-indigo-700 dark:text-indigo-300', borderClass: 'border-indigo-200 dark:border-indigo-700', bgClass: 'bg-indigo-50 dark:bg-indigo-900/10' },
  { status: 'NEGOTIATION', labelKey: 'crm.stageNegotiation', dotClass: 'bg-violet-500', headerBg: 'bg-violet-100 dark:bg-violet-900/30', textClass: 'text-violet-700 dark:text-violet-300', borderClass: 'border-violet-200 dark:border-violet-700', bgClass: 'bg-violet-50 dark:bg-violet-900/10' },
  { status: 'CONTRACT', labelKey: 'crm.stageContract', dotClass: 'bg-orange-500', headerBg: 'bg-orange-100 dark:bg-orange-900/30', textClass: 'text-orange-700 dark:text-orange-300', borderClass: 'border-orange-200 dark:border-orange-700', bgClass: 'bg-orange-50 dark:bg-orange-900/10' },
  { status: 'PAYMENT', labelKey: 'crm.stagePayment', dotClass: 'bg-yellow-500', headerBg: 'bg-yellow-100 dark:bg-yellow-900/30', textClass: 'text-yellow-700 dark:text-yellow-300', borderClass: 'border-yellow-200 dark:border-yellow-700', bgClass: 'bg-yellow-50 dark:bg-yellow-900/10' },
  { status: 'WON', labelKey: 'crm.stageWon', dotClass: 'bg-green-500', headerBg: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-300', borderClass: 'border-green-200 dark:border-green-700', bgClass: 'bg-green-50 dark:bg-green-900/10' },
  { status: 'LOST', labelKey: 'crm.stageLost', dotClass: 'bg-red-500', headerBg: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300', borderClass: 'border-red-200 dark:border-red-700', bgClass: 'bg-red-50 dark:bg-red-900/10' },
];

interface CrmClientProps {
  initialLeads: CrmLead[];
  userRole: string;
  userId: string;
  coordinators: { id: string; name: string }[];
}

export default function CrmClient({ initialLeads, userRole, userId, coordinators }: CrmClientProps) {
  const { t } = useLanguage();
  const [leads, setLeads] = useState<CrmLead[]>(initialLeads);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [coordDropdownOpen, setCoordDropdownOpen] = useState(false);
  const coordDropdownRef = useRef<HTMLDivElement>(null);
  const [waUnreadMap, setWaUnreadMap] = useState<Record<string, number>>({});
  const [socialUnreadMap, setSocialUnreadMap] = useState<Record<string, number>>({});

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (coordDropdownRef.current && !coordDropdownRef.current.contains(e.target as Node)) {
        setCoordDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll leads + WhatsApp + Social unread counts
  useEffect(() => {
    const poll = async () => {
      try {
        const [leadsRes, waRes, socialRes] = await Promise.all([
          fetch('/api/crm/leads', { cache: 'no-store' }),
          fetch('/api/whatsapp/conversations', { cache: 'no-store' }),
          fetch('/api/social/conversations', { cache: 'no-store' }),
        ]);

        if (leadsRes.ok) {
          const freshLeads: CrmLead[] = await leadsRes.json();
          setLeads(freshLeads);
        }

        if (waRes.ok) {
          const convos: { lead?: { id: string } | null; unreadCount: number }[] = await waRes.json();
          const map: Record<string, number> = {};
          for (const c of convos) {
            if (c.lead?.id && c.unreadCount > 0) {
              map[c.lead.id] = c.unreadCount;
            }
          }
          setWaUnreadMap(map);
        }

        if (socialRes.ok) {
          const convos: { lead?: { id: string } | null; unreadCount: number }[] = await socialRes.json();
          const map: Record<string, number> = {};
          for (const c of convos) {
            if (c.lead?.id && c.unreadCount > 0) {
              map[c.lead.id] = (map[c.lead.id] || 0) + c.unreadCount;
            }
          }
          setSocialUnreadMap(map);
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + ' ' + t('payments.tenge');
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = `${l.lastName} ${l.firstName}`.toLowerCase();
        const phone = (l.phone || l.parentPhone || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (coordinatorFilter && l.coordinatorId !== coordinatorFilter) return false;
      return true;
    });
  }, [leads, searchQuery, coordinatorFilter]);

  // Group by stage, leads with unread messages first (WhatsApp + Social)
  const leadsByStage = useMemo(() => {
    const map: Record<string, CrmLead[]> = {};
    for (const stage of PIPELINE_STAGES) {
      map[stage.status] = [];
    }
    for (const l of filteredLeads) {
      if (map[l.stage]) map[l.stage].push(l);
    }
    // Sort: leads with unread messages first (combine WA + Social)
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aUnread = (waUnreadMap[a.id] || 0) + (socialUnreadMap[a.id] || 0);
        const bUnread = (waUnreadMap[b.id] || 0) + (socialUnreadMap[b.id] || 0);
        if (aUnread > 0 && bUnread === 0) return -1;
        if (aUnread === 0 && bUnread > 0) return 1;
        return 0;
      });
    }
    return map;
  }, [filteredLeads, waUnreadMap, socialUnreadMap]);

  // Stage totals
  const stageTotals = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const stageLeads = leadsByStage[stage.status] || [];
      return {
        ...stage,
        count: stageLeads.length,
        totalAmount: stageLeads.reduce((sum, l) => sum + (l.amount || 0), 0),
      };
    });
  }, [leadsByStage]);

  const handleCardClick = useCallback((lead: CrmLead) => {
    setSelectedLead(lead);
    setSlideOverOpen(true);
  }, []);

  const handleStageChange = useCallback(async (leadId: string, _fromStage: string, toStage: string) => {
    // Optimistic update
    const prevLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: toStage } : l));

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: toStage }),
      });
      if (!res.ok) {
        setLeads(prevLeads);
      } else {
        const updated = await res.json();
        setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      }
    } catch {
      setLeads(prevLeads);
    }
  }, [leads]);

  const handleLeadCreated = useCallback((newLead: CrmLead) => {
    setLeads(prev => [newLead, ...prev]);
    setFormModalOpen(false);
  }, []);

  const handleLeadUpdated = useCallback((updated: CrmLead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  }, []);

  const handleLeadDeleted = useCallback((leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSlideOverOpen(false);
    setSelectedLead(null);
  }, []);

  const hasFilters = searchQuery || coordinatorFilter;

  return (
    <div className="space-y-4">
      {/* ── FILTERS BAR ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View mode toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'kanban'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
            {t('crm.viewKanban')}
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t('crm.viewTable')}
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('crm.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Coordinator */}
        {isAdmin && (
          <div className="relative" ref={coordDropdownRef}>
            <button
              onClick={() => setCoordDropdownOpen(!coordDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[160px]"
            >
              <span className="flex-1 text-left truncate">
                {coordinatorFilter
                  ? coordinators.find(c => c.id === coordinatorFilter)?.name || t('crm.allCoordinators')
                  : t('crm.allCoordinators')}
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${coordDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {coordDropdownOpen && (
              <div className="absolute right-0 mt-1 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-fade-in">
                <button
                  onClick={() => { setCoordinatorFilter(''); setCoordDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    !coordinatorFilter
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('crm.allCoordinators')}
                </button>
                {coordinators.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCoordinatorFilter(c.id); setCoordDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      coordinatorFilter === c.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSearchQuery(''); setCoordinatorFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Add Lead Button */}
        <button
          onClick={() => setFormModalOpen(true)}
          className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('crm.addLead')}
        </button>

        {/* Settings Button (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={t('crm.settings.title')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── STAGE SUMMARY ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {stageTotals.map(stage => (
          <div key={stage.status} className={`${stage.bgClass} border ${stage.borderClass} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
              <span className={`text-xs font-medium ${stage.textClass} truncate`}>{t(stage.labelKey)}</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{stage.count}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {stage.totalAmount > 0 ? formatAmount(stage.totalAmount) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN VIEW ── */}
      {viewMode === 'kanban' ? (
        <CrmKanbanBoard
          leadsByStage={leadsByStage}
          stages={PIPELINE_STAGES}
          onStageChange={handleStageChange}
          onCardClick={handleCardClick}
          formatAmount={formatAmount}
          t={t}
          waUnreadMap={waUnreadMap}
          socialUnreadMap={socialUnreadMap}
        />
      ) : (
        <CrmTableView
          leads={filteredLeads}
          stages={PIPELINE_STAGES}
          onCardClick={handleCardClick}
          formatAmount={formatAmount}
          t={t}
        />
      )}

      {/* ── LEAD SLIDE-OVER ── */}
      {selectedLead && (
        <CrmLeadSlideOver
          lead={selectedLead}
          isOpen={slideOverOpen}
          onClose={() => { setSlideOverOpen(false); setSelectedLead(null); }}
          onLeadUpdated={handleLeadUpdated}
          onLeadDeleted={handleLeadDeleted}
          formatAmount={formatAmount}
          t={t}
        />
      )}

      {/* ── ADD LEAD MODAL ── */}
      {formModalOpen && (
        <CrmLeadFormModal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          onLeadCreated={handleLeadCreated}
          t={t}
        />
      )}

      {/* ── SETTINGS MODAL ── */}
      <CrmSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        t={t}
      />
    </div>
  );
}
